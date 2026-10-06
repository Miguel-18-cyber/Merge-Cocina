const entorno = import.meta.env ?? {};
const URL_SUPABASE = String(entorno.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const CLAVE_PUBLICA = String(
  entorno.VITE_SUPABASE_PUBLISHABLE_KEY ?? entorno.VITE_SUPABASE_ANON_KEY ?? '',
).trim();
const CLAVE_SESION = 'merge-cocina-sesion-online-v1';
const CLAVE_VERIFICADOR = 'merge-cocina-oauth-verifier-v1';

export const NUBE_CONFIGURADA = Boolean(URL_SUPABASE && CLAVE_PUBLICA);

function exigirConfiguracion() {
  if (!NUBE_CONFIGURADA) {
    throw new Error('La cuenta en línea aún no está configurada. Consulta la guía de Supabase del proyecto.');
  }
}

function leerSesion() {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_SESION));
    return valor && typeof valor.access_token === 'string' ? valor : null;
  } catch {
    return null;
  }
}

function guardarSesion(valor) {
  const sesion = {
    ...valor,
    expires_at: Number(valor.expires_at) || Math.floor(Date.now() / 1000) + Number(valor.expires_in || 3600),
  };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

async function pedirAuth(ruta, { method = 'GET', body, token } = {}) {
  exigirConfiguracion();
  const headers = { apikey: CLAVE_PUBLICA, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(URL_SUPABASE + '/auth/v1/' + ruta, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const texto = await response.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = null; }
  if (!response.ok) throw crearError(datos, response.status);
  return datos;
}

function crearError(datos, status = 0) {
  const codigo = datos?.code || datos?.error_code;
  let mensaje = datos?.msg || datos?.message || datos?.error_description || datos?.error || 'No se pudo completar la solicitud.';
  if (codigo === '23505' || /nickname/i.test(mensaje) && /duplicate|unique|already/i.test(mensaje)) {
    mensaje = 'Ese apodo ya está ocupado. Prueba con otro.';
  } else if (status === 401) {
    mensaje = 'La sesión expiró. Vuelve a entrar con Google.';
  } else if (status === 0) {
    mensaje = 'No hay conexión con el servicio. Tu partida local sigue guardada.';
  }
  const error = new Error(mensaje);
  error.status = status;
  error.code = codigo;
  return error;
}

async function renovarSesion() {
  exigirConfiguracion();
  const previa = leerSesion();
  if (!previa?.refresh_token) return null;
  try {
    const nueva = await pedirAuth('token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: previa.refresh_token },
    });
    return guardarSesion(nueva);
  } catch (error) {
    if (!error.status || error.status >= 500 || !navigator.onLine) return previa;
    localStorage.removeItem(CLAVE_SESION);
    return null;
  }
}

export async function obtenerSesion() {
  if (!NUBE_CONFIGURADA) return null;
  const sesion = leerSesion();
  if (!sesion) return null;
  if (Number(sesion.expires_at) > Math.floor(Date.now() / 1000) + 60) return sesion;
  return renovarSesion();
}

export async function iniciarSesionGoogle() {
  exigirConfiguracion();
  const verificador = crearValorAleatorio();
  localStorage.setItem(CLAVE_VERIFICADOR, verificador);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  const reto = bytesABase64Url(new Uint8Array(digest));
  const retorno = window.location.origin + window.location.pathname;
  const parametros = new URLSearchParams({
    provider: 'google',
    redirect_to: retorno,
    code_challenge: reto,
    code_challenge_method: 's256',
    apikey: CLAVE_PUBLICA,
  });
  window.location.assign(URL_SUPABASE + '/auth/v1/authorize?' + parametros.toString());
}

function crearValorAleatorio() {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return bytesABase64Url(bytes);
}

function bytesABase64Url(bytes) {
  let texto = '';
  bytes.forEach((byte) => { texto += String.fromCharCode(byte); });
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function procesarRetornoGoogle() {
  if (!NUBE_CONFIGURADA) return { procesado: false, error: null };
  const url = new URL(window.location.href);
  const codigo = url.searchParams.get('code');
  const descripcionError = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (!codigo && !descripcionError) return { procesado: false, error: null };
  window.history.replaceState({}, document.title, url.pathname);
  if (descripcionError) {
    localStorage.removeItem(CLAVE_VERIFICADOR);
    return { procesado: true, error: new Error('Google canceló el acceso. Puedes volver a intentarlo.') };
  }
  const verificador = localStorage.getItem(CLAVE_VERIFICADOR);
  localStorage.removeItem(CLAVE_VERIFICADOR);
  if (!verificador) return { procesado: true, error: new Error('No encontramos la verificación de acceso. Inicia sesión otra vez.') };
  try {
    const sesion = await pedirAuth('token?grant_type=pkce', {
      method: 'POST',
      body: { auth_code: codigo, code_verifier: verificador },
    });
    guardarSesion(sesion);
    return { procesado: true, error: null };
  } catch (error) {
    return { procesado: true, error };
  }
}

async function pedirDatos(ruta, { method = 'GET', body, prefer = 'return=representation' } = {}, reintentar = true) {
  exigirConfiguracion();
  let sesion = await obtenerSesion();
  if (!sesion?.access_token) throw new Error('Inicia sesión con Google para usar las funciones en línea.');
  const headers = {
    apikey: CLAVE_PUBLICA,
    Authorization: 'Bearer ' + sesion.access_token,
    Accept: 'application/json',
    Prefer: prefer,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(URL_SUPABASE + '/rest/v1/' + ruta, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 && reintentar) {
    sesion = await renovarSesion();
    if (sesion) return pedirDatos(ruta, { method, body, prefer }, false);
  }
  const texto = await response.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = null; }
  if (!response.ok) throw crearError(datos, response.status);
  return datos;
}

export async function cerrarSesionOnline() {
  const sesion = leerSesion();
  if (sesion?.access_token && NUBE_CONFIGURADA) {
    try { await pedirAuth('logout', { method: 'POST', token: sesion.access_token }); } catch { /* Se limpia también si no hay red. */ }
  }
  localStorage.removeItem(CLAVE_SESION);
  localStorage.removeItem(CLAVE_VERIFICADOR);
}

export async function cargarCuentaOnline() {
  const [perfiles, guardados] = await Promise.all([
    pedirDatos('rpc/get_my_player_profile', { method: 'POST', body: {} }),
    pedirDatos('player_game_saves?select=save_data&limit=1'),
  ]);
  const perfil = Array.isArray(perfiles) ? perfiles[0] ?? null : null;
  return { perfil, guardado: guardados?.[0]?.save_data ?? null };
}

export async function crearPerfilOnline(apodo) {
  const filas = await pedirDatos('rpc/create_player_profile', {
    method: 'POST',
    body: { p_nickname: apodo },
  });
  return filas;
}

export async function guardarPartidaPrivadaOnline(datosPrivados) {
  return pedirDatos('rpc/save_private_game_state', {
    method: 'POST',
    body: { p_save_data: datosPrivados },
    prefer: 'return=minimal',
  });
}

export async function buscarJugadores(apodo) {
  return pedirDatos('rpc/search_players', {
    method: 'POST',
    body: { p_query: apodo },
  });
}

export async function cargarClasificacion() {
  return pedirDatos('rpc/get_leaderboard', { method: 'POST', body: {} });
}

export async function cargarClasificacionSemanal() {
  return pedirDatos('rpc/get_weekly_leaderboard', { method: 'POST', body: {} });
}

export async function cargarAmistades() {
  return pedirDatos('rpc/get_my_friendships', { method: 'POST', body: {} });
}

export async function solicitarAmistad(idJugador) {
  return pedirDatos('player_friendships', {
    method: 'POST',
    body: { recipient_id: idJugador, status: 'pending' },
    prefer: 'return=minimal',
  });
}

export async function responderSolicitudAmistad(idSolicitud, aceptar) {
  return pedirDatos('rpc/respond_friend_request', {
    method: 'POST',
    body: { p_request_id: idSolicitud, p_accept: aceptar },
    prefer: 'return=minimal',
  });
}

export async function eliminarAmistad(idSolicitud) {
  return pedirDatos('player_friendships?id=eq.' + encodeURIComponent(idSolicitud), {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}
