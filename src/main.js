import './style.css';
import { COLUMNAS, emojiPieza, nombrePieza } from './game/modelos.js';
import { NIVELES } from './data/niveles.js';
import {
  COSMETICOS,
  ICONO_PERFIL_PREDETERMINADO,
  ICONOS_PERFIL,
  MARCO_PERFIL_PREDETERMINADO,
  MARCOS_PERFIL,
  TEMA_PREDETERMINADO,
} from './data/cosmeticos.js';
import { PAQUETES_MONEDAS } from './data/paquetes-monedas.js';
import { crearLogros } from './data/logros.js';
import { iniciarAnunciosH5, mostrarAnuncioCadaDosNiveles } from './game/anuncios-h5.js';
import { ControladorJuego } from './game/estado.js';
import {
  NUBE_CONFIGURADA,
  iniciarSesionGoogle,
  procesarRetornoGoogle,
  obtenerSesion,
  cerrarSesionOnline,
  cargarCuentaOnline,
  crearPerfilOnline,
  guardarPartidaPrivadaOnline,
  buscarJugadores,
  cargarClasificacion,
  cargarClasificacionSemanal,
  cargarAmistades,
  solicitarAmistad,
  responderSolicitudAmistad,
  eliminarAmistad,
} from './game/nube.js';

const juego = new ControladorJuego();
const CLAVE_PROGRESO = 'merge-cocina-progreso-v1';
const CLAVE_PERFIL = 'merge-cocina-perfil-v1';
const CLAVE_COSMETICOS = 'merge-cocina-cosmeticos-v1';
const CLAVE_LOGROS = 'merge-cocina-logros-v1';
const CLAVE_EVENTOS_PEDIDO = 'merge-cocina-pedidos-semanales-v1';
const COSTE_PAQUETE_MOVIMIENTOS = 300;
const formatoMonedas = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const formatoMovimientos = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const formatoDolares = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
restaurarProgreso();
let perfil = restaurarPerfil();
let coleccion = restaurarCosmeticos();
let logrosDesbloqueados = restaurarLogrosDesbloqueados();
let seleccionada = null;
let transicionNivelEnCurso = false;
let fusionada = null;
let pistaIndices = [];
let avatarTemporal = null;
let sesionOnline = null;
let temporizadorNube = null;
let versionNube = 0;
let versionGuardadaNube = 0;
let sincronizacionEnCurso = false;
let sincronizandoDesdeNube = false;
const CLAVE_DUENO_NUBE = 'merge-cocina-cuenta-online-v1';
const CLAVE_NUBE_SUCIO = 'merge-cocina-cuenta-online-dirty-v1';
const LOGROS_PUBLICOS = new Set(['primer-pedido', 'ruta-de-sabores', 'gran-banquete', 'tesoro-de-cocina']);
let clasificacionSemanalActual = [];
let clasificacionHistoricaActual = [];
let periodoClasificacion = 'weekly';
const boardElement = document.querySelector('#board');
const messageElement = document.querySelector('#game-message');
const ordersListElement = document.querySelector('#orders-list');
const generateButton = document.querySelector('#generate-button');
const hintButton = document.querySelector('#hint-button');
const dialogElement = document.querySelector('#level-dialog');
const profileScreen = document.querySelector('#profile-screen');
const hubScreen = document.querySelector('#hub-screen');
const gameScreen = document.querySelector('#game-screen');
const profileForm = document.querySelector('#profile-form');
const profileDetailsForm = document.querySelector('#profile-details-form');
const achievementsListElement = document.querySelector('#achievements-list');
const cosmeticListElement = document.querySelector('#cosmetic-list');
const profileImageInput = document.querySelector('#profile-image-input');
const profileImageElement = document.querySelector('#profile-avatar-image');
const profileAvatarElement = document.querySelector('#profile-avatar');
const profileIconElement = document.querySelector('#profile-avatar-placeholder');
const coinPackListElement = document.querySelector('#coin-pack-list');

aplicarTemaTablero();

function mostrarPerfil() {
  profileScreen.hidden = false;
  hubScreen.hidden = true;
  gameScreen.hidden = true;
  profileForm.reset();
  document.querySelector('#player-name').focus();
}

function mostrarCentro() {
  profileScreen.hidden = true;
  hubScreen.hidden = false;
  gameScreen.hidden = true;
  mostrarVistaCentro('dashboard-view');
  renderCentro();
}

function mostrarVistaCentro(id) {
  hubScreen.querySelectorAll('.hub-view').forEach((view) => { view.hidden = view.id !== id; });
  document.querySelector('#edit-profile-button').hidden = id === 'profile-view';
  if (id === 'profile-view') renderPerfilVista();
  if (id === 'social-view') void cargarPanelSocial();
}

function renderCentro() {
  if (!perfil) return;
  const articulosDesbloqueados = Math.max(
    0,
    coleccion.desbloqueados.size + coleccion.marcosDesbloqueados.size + coleccion.iconosDesbloqueados.size - 3,
  );
  const logros = crearLogros({
    nivelId: juego.nivel.id,
    recompensado: juego.recompensado,
    estrellas: juego.estrellas,
    monedas: juego.monedas,
    articulosDesbloqueados,
  });
  logros.forEach((logro) => {
    if (logro.actual >= logro.meta) logrosDesbloqueados.add(logro.id);
    logro.logrado = logrosDesbloqueados.has(logro.id);
    if (logro.logrado) logro.actual = logro.meta;
  });
  guardarLogrosDesbloqueados();
  const completados = logros.filter((logro) => logro.logrado).length;
  const pedidosCompletados = juego.nivel.pedidos.length - juego.pedidosRestantes.size;
  document.querySelector('#welcome-title').textContent = `¡Hola, ${perfil.nombre}!`;
  const pedidosPendientes = juego.pedidosRestantes.size;
  const nivelFinalizado = juego.recompensado && juego.nivel.id === NIVELES.length;
  document.querySelector('#welcome-copy').textContent = nivelFinalizado
    ? '¡Completaste la aventura! Empieza otra vuelta y conserva tus monedas y estrellas.'
    : juego.recompensado
      ? `¡Nivel ${juego.nivel.id} completado! Tu cocina está lista para el siguiente reto.`
    : `Nivel ${juego.nivel.id} · ${pedidosPendientes} ${pedidosPendientes === 1 ? 'pedido' : 'pedidos'} por completar. Retoma donde lo dejaste.`;
  document.querySelector('#player-level').textContent = String(juego.nivel.id);
  document.querySelector('#hub-level-progress-copy').textContent = `${pedidosCompletados} / ${juego.nivel.pedidos.length} pedidos`;
  document.querySelector('#hub-level-progress-track').setAttribute('aria-valuemax', String(juego.nivel.pedidos.length));
  document.querySelector('#hub-level-progress-track').setAttribute('aria-valuenow', String(pedidosCompletados));
  document.querySelector('#hub-level-progress').style.width = `${pedidosCompletados / juego.nivel.pedidos.length * 100}%`;
  document.querySelector('#play-title').textContent = nivelFinalizado
    ? 'Empezar otra vuelta'
    : juego.recompensado ? 'Continuar al siguiente nivel' : 'Continuar partida';
  document.querySelector('#play-copy').textContent = nivelFinalizado
    ? 'Sigue jugando para conseguir más monedas'
    : juego.recompensado
      ? 'Recoge tu recompensa y sigue cocinando'
    : `Nivel ${juego.nivel.id}: ${juego.pedidosRestantes.size} pedidos pendientes`;
  document.querySelector('#hub-coins').textContent = formatoMonedas.format(juego.monedas);
  document.querySelector('#hub-stars').textContent = String(juego.estrellas);
  document.querySelector('#hub-achievements').textContent = String(completados);
  document.querySelector('#achievements-total').textContent = String(logros.length);
  document.querySelector('#shop-coins').textContent = `🪙 ${formatoMonedas.format(juego.monedas)}`;
  const botonMovimientos = document.querySelector('#shop-moves-button');
  botonMovimientos.disabled = juego.monedas < COSTE_PAQUETE_MOVIMIENTOS;
  botonMovimientos.title = juego.monedas < COSTE_PAQUETE_MOVIMIENTOS
    ? `Necesitas ${formatoMonedas.format(COSTE_PAQUETE_MOVIMIENTOS)} monedas para este paquete.`
    : `Añadir 5 movimientos por ${formatoMonedas.format(COSTE_PAQUETE_MOVIMIENTOS)} monedas.`;
  renderCosmeticos();
  renderPaquetesMonedas();
  achievementsListElement.replaceChildren();
  logros.forEach((logro) => {
    const item = document.createElement('article');
    item.className = `achievement-card glass-card${logro.logrado ? ' unlocked' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'achievement-icon';
    icon.textContent = logro.icono;
    const copy = document.createElement('div');
    copy.className = 'achievement-copy';
    const title = document.createElement('h3');
    title.textContent = logro.titulo;
    const description = document.createElement('p');
    description.textContent = logro.descripcion;
    const progress = document.createElement('div');
    progress.className = 'achievement-progress';
    const track = document.createElement('span');
    track.className = 'achievement-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', `${logro.titulo}: ${logro.actual} de ${logro.meta}`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(logro.meta));
    track.setAttribute('aria-valuenow', String(logro.actual));
    const fill = document.createElement('span');
    fill.style.width = `${logro.actual / logro.meta * 100}%`;
    track.append(fill);
    const count = document.createElement('small');
    count.textContent = `${logro.actual} / ${logro.meta}`;
    progress.append(track, count);
    copy.append(title, description, progress);
    const status = document.createElement('span');
    status.className = 'achievement-status';
    status.textContent = logro.logrado ? '✓' : '🔒';
    status.setAttribute('aria-label', logro.logrado ? 'Completado' : 'Pendiente');
    item.append(icon, copy, status);
    achievementsListElement.append(item);
  });
}

function restaurarCosmeticos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_COSMETICOS));
    const idsValidos = new Set(COSMETICOS.map((item) => item.id));
    const marcosValidos = new Set(MARCOS_PERFIL.map((item) => item.id));
    const iconosValidos = new Set(ICONOS_PERFIL.map((item) => item.id));
    const desbloqueados = new Set(Array.isArray(guardado?.desbloqueados)
      ? guardado.desbloqueados.filter((id) => idsValidos.has(id))
      : []);
    const marcosDesbloqueados = new Set(Array.isArray(guardado?.marcosDesbloqueados)
      ? guardado.marcosDesbloqueados.filter((id) => marcosValidos.has(id))
      : []);
    const iconosDesbloqueados = new Set(Array.isArray(guardado?.iconosDesbloqueados)
      ? guardado.iconosDesbloqueados.filter((id) => iconosValidos.has(id))
      : []);
    desbloqueados.add(TEMA_PREDETERMINADO);
    marcosDesbloqueados.add(MARCO_PERFIL_PREDETERMINADO);
    iconosDesbloqueados.add(ICONO_PERFIL_PREDETERMINADO);
    return {
      desbloqueados,
      equipado: desbloqueados.has(guardado?.equipado) ? guardado.equipado : TEMA_PREDETERMINADO,
      marcosDesbloqueados,
      marcoPerfil: marcosDesbloqueados.has(guardado?.marcoPerfil) ? guardado.marcoPerfil : MARCO_PERFIL_PREDETERMINADO,
      iconosDesbloqueados,
      iconoPerfil: iconosDesbloqueados.has(guardado?.iconoPerfil) ? guardado.iconoPerfil : ICONO_PERFIL_PREDETERMINADO,
    };
  } catch (error) {
    console.warn('Los estilos guardados no se pudieron leer; se usará el marco inicial.', error);
    return {
      desbloqueados: new Set([TEMA_PREDETERMINADO]),
      equipado: TEMA_PREDETERMINADO,
      marcosDesbloqueados: new Set([MARCO_PERFIL_PREDETERMINADO]),
      marcoPerfil: MARCO_PERFIL_PREDETERMINADO,
      iconosDesbloqueados: new Set([ICONO_PERFIL_PREDETERMINADO]),
      iconoPerfil: ICONO_PERFIL_PREDETERMINADO,
    };
  }
}

function datosCosmeticos() {
  return {
    desbloqueados: [...coleccion.desbloqueados],
    equipado: coleccion.equipado,
    marcosDesbloqueados: [...coleccion.marcosDesbloqueados],
    marcoPerfil: coleccion.marcoPerfil,
    iconosDesbloqueados: [...coleccion.iconosDesbloqueados],
    iconoPerfil: coleccion.iconoPerfil,
  };
}

function guardarCosmeticos() {
  try { localStorage.setItem(CLAVE_COSMETICOS, JSON.stringify(datosCosmeticos())); }
  catch (error) { console.warn('No se pudieron guardar los estilos en este navegador.', error); }
  programarGuardadoNube();
}

function aplicarTemaTablero() {
  gameScreen.dataset.skin = coleccion.equipado;
  const tema = COSMETICOS.find((item) => item.id === coleccion.equipado) ?? COSMETICOS[0];
  gameScreen.style.setProperty('--skin-accent', tema.acento);
  gameScreen.style.setProperty('--skin-deep', tema.fondo);
}

function renderCosmeticos() {
  if (!cosmeticListElement) return;
  cosmeticListElement.replaceChildren();
  COSMETICOS.forEach((cosmetico) => {
    const desbloqueado = coleccion.desbloqueados.has(cosmetico.id);
    const equipado = coleccion.equipado === cosmetico.id;
    const tarjeta = document.createElement('article');
    tarjeta.className = `cosmetic-card glass-card${equipado ? ' equipped' : ''}`;

    const preview = document.createElement('div');
    preview.className = 'cosmetic-preview';
    preview.dataset.skin = cosmetico.id;
    preview.style.setProperty('--preview-accent', cosmetico.acento);
    preview.style.setProperty('--preview-deep', cosmetico.fondo);
    preview.setAttribute('aria-hidden', 'true');
    for (const emoji of cosmetico.muestra ?? ['🌾', '🍞', '🍓']) {
      const pieza = document.createElement('span');
      pieza.textContent = emoji;
      preview.append(pieza);
    }

    const details = document.createElement('div');
    details.className = 'cosmetic-details';
    const category = document.createElement('p');
    category.className = 'eyebrow';
    category.textContent = cosmetico.categoria;
    const title = document.createElement('h4');
    title.textContent = `${cosmetico.icono} ${cosmetico.nombre}`;
    const description = document.createElement('p');
    description.textContent = cosmetico.descripcion;
    details.append(category, title, description);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cosmetic-button';
    button.disabled = equipado || (!desbloqueado && juego.monedas < cosmetico.precio);
    button.textContent = equipado
      ? '✓ En uso'
      : desbloqueado
        ? 'Usar este estilo'
        : `Desbloquear · ${formatoMonedas.format(cosmetico.precio)} 🪙`;
    button.setAttribute('aria-label', equipado
      ? `${cosmetico.nombre}, estilo equipado`
      : desbloqueado
        ? `Equipar ${cosmetico.nombre}`
        : `Desbloquear ${cosmetico.nombre} por ${formatoMonedas.format(cosmetico.precio)} monedas`);
    button.addEventListener('click', () => seleccionarCosmetico(cosmetico));

    tarjeta.append(preview, details, button);
    cosmeticListElement.append(tarjeta);
  });
  renderMarcosPerfil();
  renderIconosPerfil();
}

function renderPaquetesMonedas() {
  if (!coinPackListElement) return;
  coinPackListElement.replaceChildren();
  PAQUETES_MONEDAS.forEach((paquete) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = `shop-pack coin-pack glass-card${paquete.destacado ? ' featured-pack' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'pack-icon';
    icon.textContent = paquete.icono;
    icon.setAttribute('aria-hidden', 'true');
    const nombre = document.createElement('h3');
    nombre.textContent = paquete.nombre;
    const cantidad = document.createElement('p');
    cantidad.className = 'coin-pack-amount';
    cantidad.textContent = `${formatoMonedas.format(paquete.monedas)} monedas`;
    const precio = document.createElement('strong');
    precio.className = 'coin-pack-price';
    precio.textContent = formatoDolares.format(paquete.precioUsd).replace('$', 'US$');
    const button = document.createElement('button');
    button.className = 'shop-button';
    button.type = 'button';
    button.disabled = true;
    button.textContent = 'Próximamente';
    button.title = 'Las compras se habilitarán al conectar un proveedor de pagos.';
    button.setAttribute('aria-label', `${paquete.nombre}: ${formatoMonedas.format(paquete.monedas)} monedas por ${precio.textContent}. Próximamente.`);
    tarjeta.append(icon, nombre, cantidad, precio, button);
    coinPackListElement.append(tarjeta);
  });
}

function seleccionarCosmetico(cosmetico) {
  const cosmeticoDesbloqueado = coleccion.desbloqueados.has(cosmetico.id);
  if (!cosmeticoDesbloqueado) {
    if (juego.monedas < cosmetico.precio) return;
    juego.monedas -= cosmetico.precio;
    coleccion.desbloqueados.add(cosmetico.id);
  }
  coleccion.equipado = cosmetico.id;
  guardarCosmeticos();
  guardarProgreso();
  aplicarTemaTablero();
  renderCentro();
  document.querySelector('#cosmetic-feedback').textContent = cosmeticoDesbloqueado
    ? `Listo: ${cosmetico.nombre} está aplicado a tu tablero.`
    : `¡Desbloqueaste ${cosmetico.nombre}! Ya está aplicado a tu tablero.`;
}

function renderMarcosPerfil() {
  const listaTienda = document.querySelector('#profile-frame-shop-list');
  if (listaTienda) {
    listaTienda.replaceChildren();
    MARCOS_PERFIL.forEach((marco) => {
      const desbloqueado = coleccion.marcosDesbloqueados.has(marco.id);
      const equipado = coleccion.marcoPerfil === marco.id;
      const tarjeta = document.createElement('article');
      tarjeta.className = `cosmetic-card glass-card${equipado ? ' equipped' : ''}`;
      const preview = document.createElement('div');
      preview.className = 'cosmetic-preview profile-frame-preview';
      preview.dataset.frame = marco.id;
      preview.style.setProperty('--frame-accent', marco.acento);
      preview.style.setProperty('--frame-deep', marco.fondo);
      preview.setAttribute('aria-hidden', 'true');
      const sample = document.createElement('span');
      sample.textContent = '👩‍🍳';
      preview.append(sample);
      const details = document.createElement('div');
      details.className = 'cosmetic-details';
      const category = document.createElement('p');
      category.className = 'eyebrow';
      category.textContent = 'Marco de perfil';
      const title = document.createElement('h4');
      title.textContent = `${marco.icono} ${marco.nombre}`;
      const description = document.createElement('p');
      description.textContent = marco.descripcion;
      details.append(category, title, description);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cosmetic-button';
      button.disabled = equipado || (!desbloqueado && juego.monedas < marco.precio);
      button.textContent = equipado
        ? '✓ En uso'
        : desbloqueado
          ? 'Usar este marco'
          : `Desbloquear · ${formatoMonedas.format(marco.precio)} 🪙`;
      button.setAttribute('aria-label', equipado
        ? `${marco.nombre}, marco equipado`
        : desbloqueado
          ? `Equipar ${marco.nombre}`
          : `Desbloquear ${marco.nombre} por ${formatoMonedas.format(marco.precio)} monedas`);
      button.addEventListener('click', () => seleccionarMarcoPerfil(marco));
      tarjeta.append(preview, details, button);
      listaTienda.append(tarjeta);
    });
  }
  renderMarcosDesbloqueados();
}

function renderMarcosDesbloqueados() {
  const lista = document.querySelector('#profile-frame-options');
  if (!lista) return;
  lista.replaceChildren();
  MARCOS_PERFIL.filter((marco) => coleccion.marcosDesbloqueados.has(marco.id)).forEach((marco) => {
    const equipado = coleccion.marcoPerfil === marco.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `profile-frame-option${equipado ? ' selected' : ''}`;
    button.disabled = equipado;
    button.setAttribute('aria-pressed', String(equipado));
    button.setAttribute('aria-label', `${marco.nombre}${equipado ? ', equipado' : ', equipar'}`);
    const icon = document.createElement('span');
    icon.textContent = marco.icono;
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = marco.nombre;
    button.append(icon, label);
    button.addEventListener('click', () => seleccionarMarcoPerfil(marco, { desdePerfil: true }));
    lista.append(button);
  });
}

function renderIconosPerfil() {
  const listaTienda = document.querySelector('#profile-icon-shop-list');
  if (listaTienda) {
    listaTienda.replaceChildren();
    ICONOS_PERFIL.forEach((icono) => {
      const desbloqueado = coleccion.iconosDesbloqueados.has(icono.id);
      const equipado = coleccion.iconoPerfil === icono.id;
      const tarjeta = document.createElement('article');
      tarjeta.className = `cosmetic-card glass-card${equipado ? ' equipped' : ''}`;
      const preview = document.createElement('div');
      preview.className = 'cosmetic-preview profile-icon-preview';
      preview.dataset.icon = icono.id;
      preview.setAttribute('aria-hidden', 'true');
      const sample = document.createElement('span');
      sample.textContent = icono.emoji;
      preview.append(sample);
      const details = document.createElement('div');
      details.className = 'cosmetic-details';
      const category = document.createElement('p');
      category.className = 'eyebrow';
      category.textContent = 'Icono de perfil';
      const title = document.createElement('h4');
      title.textContent = icono.nombre;
      const description = document.createElement('p');
      description.textContent = desbloqueado ? 'Listo para usar en tu perfil.' : 'Desbloquéalo con monedas y llévalo en tu perfil.';
      details.append(category, title, description);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cosmetic-button';
      button.disabled = equipado || (!desbloqueado && juego.monedas < icono.precio);
      button.textContent = equipado
        ? '✓ En uso'
        : desbloqueado
          ? 'Usar este icono'
          : `Desbloquear · ${formatoMonedas.format(icono.precio)} 🪙`;
      button.setAttribute('aria-label', equipado
        ? `${icono.nombre}, icono equipado`
        : desbloqueado
          ? `Equipar ${icono.nombre}`
          : `Desbloquear ${icono.nombre} por ${formatoMonedas.format(icono.precio)} monedas`);
      button.addEventListener('click', () => seleccionarIconoPerfil(icono));
      tarjeta.append(preview, details, button);
      listaTienda.append(tarjeta);
    });
  }
  renderIconosDesbloqueados();
}

function renderIconosDesbloqueados() {
  const lista = document.querySelector('#profile-icon-options');
  if (!lista) return;
  lista.replaceChildren();
  ICONOS_PERFIL.filter((icono) => coleccion.iconosDesbloqueados.has(icono.id)).forEach((icono) => {
    const equipado = coleccion.iconoPerfil === icono.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `profile-frame-option profile-icon-option${equipado ? ' selected' : ''}`;
    button.disabled = equipado;
    button.setAttribute('aria-pressed', String(equipado));
    button.setAttribute('aria-label', `${icono.nombre}${equipado ? ', equipado' : ', equipar'}`);
    const avatar = document.createElement('span');
    avatar.className = 'profile-icon-choice';
    avatar.textContent = icono.emoji;
    avatar.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = icono.nombre;
    button.append(avatar, label);
    button.addEventListener('click', () => seleccionarIconoPerfil(icono, { desdePerfil: true }));
    lista.append(button);
  });
}

function seleccionarIconoPerfil(icono, { desdePerfil = false } = {}) {
  const yaDesbloqueado = coleccion.iconosDesbloqueados.has(icono.id);
  if (!yaDesbloqueado) {
    if (juego.monedas < icono.precio) return;
    juego.monedas -= icono.precio;
    coleccion.iconosDesbloqueados.add(icono.id);
  }
  coleccion.iconoPerfil = icono.id;
  if (perfil) {
    perfil = { ...perfil, avatarMode: 'icono' };
    guardarPerfil();
  }
  avatarTemporal = null;
  profileImageInput.value = '';
  guardarCosmeticos();
  guardarProgreso();
  renderCentro();
  renderAvatarPerfil();
  renderIconosDesbloqueados();
  document.querySelector(desdePerfil ? '#profile-feedback' : '#icon-shop-feedback').textContent = yaDesbloqueado
    ? `${icono.nombre} está aplicado a tu perfil. Tu foto guardada se conserva.`
    : `¡Desbloqueaste ${icono.nombre}! Ya está aplicado a tu perfil.`;
}

function seleccionarMarcoPerfil(marco, { desdePerfil = false } = {}) {
  const yaDesbloqueado = coleccion.marcosDesbloqueados.has(marco.id);
  if (!yaDesbloqueado) {
    if (juego.monedas < marco.precio) return;
    juego.monedas -= marco.precio;
    coleccion.marcosDesbloqueados.add(marco.id);
  }
  coleccion.marcoPerfil = marco.id;
  guardarCosmeticos();
  guardarProgreso();
  renderCentro();
  if (desdePerfil) {
    renderAvatarPerfil();
    renderMarcosDesbloqueados();
    document.querySelector('#profile-feedback').textContent = `Tu ícono ahora usa ${marco.nombre}.`;
  } else {
    document.querySelector('#frame-shop-feedback').textContent = yaDesbloqueado
      ? `${marco.nombre} está aplicado a tu perfil.`
      : `¡Desbloqueaste ${marco.nombre}! Ya está aplicado a tu perfil.`;
  }
}

function restaurarPerfil() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PERFIL));
    if (typeof guardado?.nombre === 'string' && guardado.nombre.trim() && Number.isInteger(guardado.edad)) {
      const avatar = typeof guardado.avatar === 'string'
        && guardado.avatar.startsWith('data:image/')
        && guardado.avatar.length <= 1000000
        ? guardado.avatar
        : '';
      return {
        nombre: guardado.nombre.trim().slice(0, 24),
        edad: guardado.edad,
        descripcion: typeof guardado.descripcion === 'string' ? guardado.descripcion.slice(0, 180) : '',
        avatar,
        avatarMode: guardado.avatarMode === 'icono' ? 'icono' : avatar ? 'imagen' : 'icono',
      };
    }
  } catch (error) {
    console.warn('El perfil guardado no se pudo leer.', error);
  }
  return null;
}

function guardarPerfil() {
  try { localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil)); }
  catch (error) { console.warn('No se pudo guardar el perfil en este navegador.', error); }
  programarGuardadoNube();
}

function renderPerfilVista() {
  if (!perfil) return;
  document.querySelector('#profile-display-name').textContent = perfil.nombre;
  document.querySelector('#profile-account-status').textContent = sesionOnline
    ? 'Cuenta conectada con Google. Tu apodo es visible; las estadísticas aparecerán tras la validación del servidor.'
    : 'Perfil guardado en este dispositivo.';
  document.querySelector('#sign-out-button').hidden = !sesionOnline;
  document.querySelector('#profile-display-age').textContent = `${perfil.edad} años`;
  document.querySelector('#profile-display-description').textContent = perfil.descripcion || 'Todavía no has escrito una descripción.';
  document.querySelector('#profile-description-input').value = perfil.descripcion || '';
  profileImageInput.value = '';
  avatarTemporal = null;
  renderAvatarPerfil();
  renderMarcosDesbloqueados();
  renderIconosDesbloqueados();
}

function renderAvatarPerfil() {
  if (!profileAvatarElement || !perfil) return;
  const imagen = avatarTemporal !== null
    ? avatarTemporal
    : perfil.avatarMode === 'icono' ? '' : perfil.avatar;
  profileAvatarElement.dataset.frame = coleccion.marcoPerfil;
  const marco = MARCOS_PERFIL.find((item) => item.id === coleccion.marcoPerfil) ?? MARCOS_PERFIL[0];
  profileAvatarElement.style.setProperty('--frame-accent', marco.acento);
  profileAvatarElement.style.setProperty('--frame-deep', marco.fondo);
  profileImageElement.hidden = !imagen;
  profileImageElement.src = imagen || '';
  profileIconElement.textContent = ICONOS_PERFIL.find((icono) => icono.id === coleccion.iconoPerfil)?.emoji ?? '👩‍🍳';
  profileIconElement.hidden = Boolean(imagen);
  const tieneFotoGuardada = avatarTemporal === null ? Boolean(perfil.avatar) : Boolean(avatarTemporal);
  document.querySelector('#remove-profile-image').hidden = !tieneFotoGuardada;
}

async function convertirImagenPerfil(archivo) {
  if (!archivo.type.startsWith('image/')) throw new Error('Elige un archivo de imagen.');
  if (archivo.size > 10 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 10 MB.');
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    await new Promise((resolve, reject) => {
      imagen.onload = resolve;
      imagen.onerror = () => reject(new Error('No se pudo abrir esa imagen.'));
      imagen.src = url;
    });
    const escala = Math.min(1, 512 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar la imagen.');
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderTablero() {
  boardElement.replaceChildren();
  juego.tablero.forEach((pieza, indice) => {
    const celda = document.createElement('button');
    const columna = indice % COLUMNAS + 1;
    const fila = Math.floor(indice / COLUMNAS) + 1;
    celda.type = 'button';
    celda.disabled = juego.movimientosRestantes < 1;
    celda.className = `board-cell${pieza ? '' : ' empty'}${seleccionada === indice ? ' selected' : ''}${fusionada === indice ? ' merged' : ''}${pistaIndices.includes(indice) ? ' hinted' : ''}`;
    celda.setAttribute('aria-pressed', String(seleccionada === indice));
    celda.setAttribute('aria-label', pieza
      ? `Fila ${fila}, columna ${columna}: ${nombrePieza(pieza.familia, pieza.nivel)}, nivel ${pieza.nivel}`
      : `Fila ${fila}, columna ${columna}: casilla vacía`);
    celda.addEventListener('click', () => tocarCelda(indice));
    if (pieza) {
      const emoji = document.createElement('span');
      emoji.className = 'piece-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = emojiPieza(pieza.familia, pieza.nivel);
      const nivel = document.createElement('span');
      nivel.className = 'piece-level';
      nivel.textContent = `Nv. ${pieza.nivel}`;
      celda.append(emoji, nivel);
    }
    boardElement.append(celda);
  });
  renderMovimientos();
}

function renderMovimientos() {
  document.querySelector('#moves-count').textContent = `${formatoMovimientos.format(juego.movimientosRestantes)} / ${formatoMovimientos.format(juego.movimientosMaximos)}`;
  document.querySelector('#defeats-count').textContent = `Derrotas ${juego.derrotasEnNivel} / 2`;
  const progreso = document.querySelector('#moves-progress');
  progreso.style.width = `${juego.movimientosMaximos ? juego.movimientosRestantes / juego.movimientosMaximos * 100 : 0}%`;
  const indicador = document.querySelector('#moves-meter');
  indicador.setAttribute('aria-valuemax', String(juego.movimientosMaximos));
  indicador.setAttribute('aria-valuenow', String(juego.movimientosRestantes));
  document.querySelector('#moves-meter-label').textContent = `${formatoMovimientos.format(juego.movimientosRestantes)} ${juego.movimientosRestantes === 1 ? 'disponible' : 'disponibles'}`;
  generateButton.disabled = juego.movimientosRestantes < 0.5 || !juego.tablero.includes(null);
  generateButton.title = !juego.tablero.includes(null)
    ? 'La cocina está llena. Combina o entrega algo para liberar espacio.'
    : juego.movimientosRestantes < 0.5 ? 'No quedan movimientos en este intento.' : 'Generar un ingrediente cuesta ½ movimiento.';
}

function renderPedidos() {
  const entregados = juego.nivel.pedidos.length - juego.pedidosRestantes.size;
  document.querySelector('#orders-progress').textContent = `${entregados} / ${juego.nivel.pedidos.length}`;
  ordersListElement.replaceChildren();
  juego.nivel.pedidos.forEach((pedido) => {
    const pendiente = juego.pedidosRestantes.has(pedido.id);
    const item = document.createElement('article');
    item.className = `order-item${pendiente ? '' : ' done'}`;
    const icon = document.createElement('span');
    icon.className = 'order-food';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = emojiPieza(pedido.familia, pedido.nivel);
    const copy = document.createElement('div');
    copy.className = 'order-copy';
    const name = document.createElement('p');
    name.className = 'order-name';
    name.textContent = nombrePieza(pedido.familia, pedido.nivel);
    const count = document.createElement('p');
    count.className = 'order-count';
    const disponibles = juego.tablero.filter((pieza) => pieza?.familia === pedido.familia && pieza.nivel === pedido.nivel).length;
    count.textContent = `${disponibles} / ${pedido.cantidad} ${pedido.cantidad === 1 ? 'pieza' : 'piezas'}`;
    copy.append(name, count);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'deliver-button';
    button.textContent = pendiente ? 'Entregar' : '✓ Listo';
    button.disabled = !pendiente || !juego.puedeEntregar(pedido);
    button.setAttribute('aria-label', pendiente
      ? `Entregar ${pedido.cantidad} ${nombrePieza(pedido.familia, pedido.nivel).toLowerCase()} sin gastar movimientos`
      : `Pedido de ${nombrePieza(pedido.familia, pedido.nivel).toLowerCase()} completado`);
    button.addEventListener('click', () => entregarPedido(pedido.id));
    item.append(icon, copy, button);
    ordersListElement.append(item);
  });
}

function renderEstado() {
  document.querySelector('#level-label').textContent = `NIVEL ${juego.nivel.id}`;
  document.querySelector('#level-name').textContent = juego.nivel.nombre;
  document.querySelector('#level-count').textContent = `${juego.nivel.id} / ${NIVELES.length}`;
  document.querySelector('#coins-count').textContent = `🪙 ${formatoMonedas.format(juego.monedas)}`;
  document.querySelector('#stars-count').textContent = `⭐ ${juego.estrellas}`;
  renderTablero();
  renderPedidos();
  renderCentro();
  guardarProgreso();
}

function avanzarNivelCompletado() {
  if (transicionNivelEnCurso || !juego.recompensado) return;
  transicionNivelEnCurso = true;
  const nivelCompletado = juego.nivel.id;

  const continuar = () => {
    if (nivelCompletado >= NIVELES.length) juego.empezarOtraVuelta();
    else juego.avanzarNivel();
    seleccionada = null;
    pistaIndices = [];
    messageElement.textContent = juego.nivel.id === 1
      ? '¡Nueva vuelta! Tus monedas y estrellas siguen contigo.'
      : 'Prepara los pedidos de este nivel.';
    transicionNivelEnCurso = false;
    renderEstado();
  };

  mostrarAnuncioCadaDosNiveles(nivelCompletado, continuar);
}

function mostrarRecompensa() {
  const { monedas, estrellas } = juego.nivel.recompensa;
  document.querySelector('#dialog-reward').textContent = `Ganaste ${formatoMonedas.format(monedas)} monedas y ${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'}.`;
  document.querySelector('#next-level-button').textContent = juego.nivel.id < NIVELES.length
    ? 'Siguiente nivel'
    : 'Empezar otra vuelta';
  if (!dialogElement.open) dialogElement.showModal();
}

function restaurarProgreso() {
  try {
    const guardado = localStorage.getItem(CLAVE_PROGRESO);
    if (guardado) juego.restaurar(JSON.parse(guardado));
  } catch (error) {
    console.warn('El progreso guardado no se pudo leer; se inicia una partida nueva.', error);
    try { localStorage.removeItem(CLAVE_PROGRESO); } catch { /* El almacenamiento puede estar bloqueado. */ }
  }
}

function guardarProgreso() {
  try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(juego.serializar())); }
  catch (error) { console.warn('No se pudo guardar el progreso en este navegador.', error); }
  programarGuardadoNube();
}

function restaurarLogrosDesbloqueados() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_LOGROS));
    return new Set(Array.isArray(guardados) ? guardados.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function guardarLogrosDesbloqueados() {
  try { localStorage.setItem(CLAVE_LOGROS, JSON.stringify([...logrosDesbloqueados])); }
  catch (error) { console.warn('No se pudieron guardar los logros en este navegador.', error); }
  programarGuardadoNube();
}

function tocarCelda(indice) {
  pistaIndices = [];
  if (seleccionada === indice) {
    seleccionada = null;
    messageElement.textContent = 'Selección cancelada. Elige una pieza cuando quieras.';
    renderTablero();
    return;
  }
  if (seleccionada === null || !juego.tablero[indice]) {
    seleccionada = juego.tablero[indice] ? indice : null;
    const pieza = seleccionada === null ? null : juego.tablero[seleccionada];
    messageElement.textContent = pieza
      ? `Elegiste ${nombrePieza(pieza.familia, pieza.nivel)}. Toca otra igual para combinar (1 movimiento).`
      : 'Elige una pieza para empezar.';
    renderTablero();
    return;
  }
  const resultado = juego.combinar(seleccionada, indice);
  if (!resultado.ok) {
    if (resultado.motivo === 'piezas-distintas') {
      seleccionada = resultado.derrota ? null : indice;
      messageElement.textContent = resultado.derrota
        ? textoDerrota(resultado.derrota)
        : 'Los productos son distintos. Se descontó 1 movimiento; combina dos iguales.';
      renderEstado();
      return;
    }

    seleccionada = resultado.motivo === 'sin-movimientos' ? null : indice;
    messageElement.textContent = resultado.motivo === 'nivel-maximo'
      ? 'Esta receta ya alcanzó su nivel máximo.'
      : resultado.motivo === 'sin-movimientos'
        ? 'Para combinar necesitas 1 movimiento completo. Generar un ingrediente cuesta ½ movimiento.'
        : 'No se pudo combinar esa pieza.';
    renderTablero();
    return;
  }
  seleccionada = null;
  fusionada = indice;
  messageElement.textContent = resultado.derrota
    ? textoDerrota(resultado.derrota)
    : `¡Combinadas! Descubriste ${nombrePieza(resultado.pieza.familia, resultado.pieza.nivel).toLowerCase()}.`;
  renderEstado();
  window.setTimeout(() => { fusionada = null; }, 360);
}

function generarPieza() {
  const resultado = juego.generar();
  if (!resultado.ok) {
    messageElement.textContent = resultado.motivo === 'tablero-lleno'
      ? 'La cocina está llena. Combina o entrega una pieza primero.'
      : resultado.motivo === 'sin-movimientos'
        ? 'No quedan movimientos. Entrega lo que ya preparaste o consigue movimientos extra en la tienda.'
        : 'La cocina está llena. Combina o entrega una pieza para hacer espacio.';
    return;
  }
  seleccionada = null;
  pistaIndices = [];
  messageElement.textContent = resultado.derrota
    ? textoDerrota(resultado.derrota)
    : `Llegó un ingrediente de ${resultado.familia === 'pan' ? 'pan' : 'fruta'}.`;
  renderEstado();
}

function entregarPedido(pedidoId) {
  const resultado = juego.entregar(pedidoId);
  if (!resultado.ok) return;
  seleccionada = null;
  pistaIndices = [];
  messageElement.textContent = resultado.derrota
    ? textoDerrota(resultado.derrota)
    : 'Pedido entregado. ¡Buen trabajo!';
  renderEstado();
  if (resultado.recompensa) {
    mostrarRecompensa();
  }
}

function mostrarPista() {
  if (juego.movimientosRestantes <= 0) {
    messageElement.textContent = `No quedan movimientos. Entrega los pedidos listos o consigue 5 movimientos en la tienda por ${formatoMonedas.format(COSTE_PAQUETE_MOVIMIENTOS)} monedas.`;
    return;
  }
  const piezas = juego.tablero;
  const pedidosPendientes = juego.nivel.pedidos.filter((pedido) => juego.pedidosRestantes.has(pedido.id));
  const pares = [];
  for (let origen = 0; origen < piezas.length; origen += 1) {
    const pieza = piezas[origen];
    if (juego.movimientosRestantes < 1 || !pieza || pieza.nivel >= 5) continue;
    for (let destino = origen + 1; destino < piezas.length; destino += 1) {
      const otra = piezas[destino];
      if (!otra || pieza.familia !== otra.familia || pieza.nivel !== otra.nivel) continue;
      const objetivo = pedidosPendientes
        .filter((pedido) => pedido.familia === pieza.familia && pedido.nivel > pieza.nivel)
        .sort((a, b) => a.nivel - b.nivel)[0];
      pares.push({ origen, destino, pieza, objetivo, prioridad: objetivo ? objetivo.nivel * 10 + pieza.nivel : pieza.nivel });
    }
  }
  pares.sort((a, b) => b.prioridad - a.prioridad);
  if (pares.length) {
    const par = pares[0];
    pistaIndices = [par.origen, par.destino];
    const nombre = nombrePieza(par.pieza.familia, par.pieza.nivel);
    messageElement.textContent = par.objetivo
      ? `Pista gratis: combina las dos piezas de ${nombre.toLowerCase()} para acercarte al pedido de ${nombrePieza(par.objetivo.familia, par.objetivo.nivel).toLowerCase()}.`
      : `Pista gratis: combina las dos piezas de ${nombre.toLowerCase()}.`;
    renderTablero();
    return;
  }
  pistaIndices = [];
  if (!juego.tablero.includes(null)) {
    const listo = pedidosPendientes.find((pedido) => juego.puedeEntregar(pedido));
    messageElement.textContent = listo
      ? `Pista gratis: entrega el pedido de ${nombrePieza(listo.familia, listo.nivel).toLowerCase()} para liberar espacio; no cuesta movimientos.`
      : juego.movimientosRestantes < 1
        ? 'Pista gratis: te falta 1 movimiento completo para combinar; compra movimientos en la tienda.'
        : 'Pista gratis: la cocina está llena. Combina piezas iguales para abrir espacio.';
    renderTablero();
    return;
  }
  const familia = juego.familiaSugerida();
  const pedido = pedidosPendientes.find((item) => item.familia === familia);
  messageElement.textContent = pedido
    ? `Pista gratis: genera ${nombrePieza(familia, 1).toLowerCase()} para empezar a preparar el pedido de ${nombrePieza(pedido.familia, pedido.nivel).toLowerCase()}.`
    : `Pista gratis: genera ${nombrePieza(familia, 1).toLowerCase()} y busca otra pieza igual.`;
  renderTablero();
}

function textoDerrota(derrota) {
  return derrota.pedidosReiniciados
    ? 'Te quedaste sin movimientos por segunda vez. Se reiniciaron los pedidos de este nivel; conservas tu nivel, monedas y estrellas.'
    : 'Te quedaste sin movimientos. Se recargó el tablero y conservas los pedidos que ya entregaste.';
}


function actualizarEstadoCuenta(texto) {
  const entrada = document.querySelector('#account-status');
  const perfilEstado = document.querySelector('#profile-account-status');
  if (entrada) entrada.textContent = texto;
  if (perfilEstado) perfilEstado.textContent = texto;
}

function mostrarAccesoOnline() {
  mostrarPerfil();
  document.querySelector('#account-entry').hidden = false;
  document.querySelector('#google-login-button').hidden = false;
  document.querySelector('#local-profile-button').hidden = true;
  profileForm.hidden = true;
  actualizarEstadoCuenta('Entra con Google para recuperar tu cocina y jugar con amigos.');
}

function elegirPeriodoClasificacion(periodo) {
  periodoClasificacion = periodo;
  renderClasificacionActual();
}

function limpiarDatosLocalesDeOtraCuenta() {
  sincronizandoDesdeNube = true;
  [CLAVE_PROGRESO, CLAVE_PERFIL, CLAVE_COSMETICOS, CLAVE_LOGROS, CLAVE_EVENTOS_PEDIDO, CLAVE_DUENO_NUBE, CLAVE_NUBE_SUCIO].forEach((clave) => localStorage.removeItem(clave));
  perfil = null;
  juego.reiniciarPartida();
  coleccion = restaurarCosmeticos();
  logrosDesbloqueados = new Set();
  sincronizandoDesdeNube = false;
}

function aplicarDatosDeCuenta(cuenta) {
  if (!cuenta?.perfil || !cuenta?.guardado) return false;
  const datos = cuenta.guardado;
  sincronizandoDesdeNube = true;
  try {
    if (datos.game) {
      juego.restaurar(datos.game);
      localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(juego.serializar()));
    }
    const datosPerfil = datos.profile && typeof datos.profile === 'object' ? datos.profile : {};
    perfil = {
      nombre: cuenta.perfil.nickname,
      edad: Number.isInteger(datosPerfil.edad) ? datosPerfil.edad : 0,
      descripcion: typeof datosPerfil.descripcion === 'string' ? datosPerfil.descripcion.slice(0, 180) : '',
      avatar: typeof datosPerfil.avatar === 'string' && datosPerfil.avatar.startsWith('data:image/')
        && datosPerfil.avatar.length <= 1000000 ? datosPerfil.avatar : '',
      avatarMode: datosPerfil.avatarMode === 'icono' ? 'icono' : datosPerfil.avatar ? 'imagen' : 'icono',
    };
    localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
    if (datos.cosmetics) localStorage.setItem(CLAVE_COSMETICOS, JSON.stringify(datos.cosmetics));
    coleccion = restaurarCosmeticos();
    const idsLogros = Array.isArray(datos.achievements)
      ? datos.achievements.filter((id) => typeof id === 'string')
      : [];
    logrosDesbloqueados = new Set(idsLogros);
    localStorage.setItem(CLAVE_LOGROS, JSON.stringify(idsLogros));
    aplicarTemaTablero();
  } finally {
    sincronizandoDesdeNube = false;
  }
  return true;
}

async function iniciarAplicacion() {
  const accountEntry = document.querySelector('#account-entry');
  const googleButton = document.querySelector('#google-login-button');
  const localButton = document.querySelector('#local-profile-button');
  if (!NUBE_CONFIGURADA) {
    accountEntry.hidden = true;
    profileForm.hidden = false;
    renderEstado();
    if (perfil) mostrarCentro();
    else mostrarPerfil();
    return;
  }

  accountEntry.hidden = false;
  googleButton.hidden = false;
  localButton.hidden = true;
  profileForm.hidden = true;
  mostrarAccesoOnline();

  const retorno = await procesarRetornoGoogle();
  if (retorno.error) actualizarEstadoCuenta(retorno.error.message);
  try {
    sesionOnline = await obtenerSesion();
    if (!sesionOnline?.user?.id) {
      if (localStorage.getItem(CLAVE_DUENO_NUBE) && perfil) {
        renderEstado();
        mostrarCentro();
        actualizarEstadoCuenta('Sin conexión con Google. Puedes seguir jugando; la partida se sincronizará cuando vuelvas a entrar.');
        return;
      }
      renderEstado();
      mostrarAccesoOnline();
      return;
    }

    const idUsuario = sesionOnline.user.id;
    const propietarioLocal = localStorage.getItem(CLAVE_DUENO_NUBE);
    if (propietarioLocal && propietarioLocal !== idUsuario) limpiarDatosLocalesDeOtraCuenta();

    const cuenta = await cargarCuentaOnline(idUsuario);
    const conservarCambiosLocales = localStorage.getItem(CLAVE_DUENO_NUBE) === idUsuario
      && localStorage.getItem(CLAVE_NUBE_SUCIO) === '1';
    if (cuenta.perfil && cuenta.guardado && !conservarCambiosLocales && aplicarDatosDeCuenta(cuenta)) {
      localStorage.setItem(CLAVE_DUENO_NUBE, idUsuario);
      googleButton.hidden = true;
      accountEntry.hidden = true;
      renderEstado();
      mostrarCentro();
      actualizarEstadoCuenta('Tu progreso se sincronizó con tu cuenta de Google.');
      return;
    }
    if (cuenta.perfil && cuenta.guardado && conservarCambiosLocales) {
      perfil = { ...perfil, nombre: cuenta.perfil.nickname };
      localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
      versionNube += 1;
      localStorage.setItem(CLAVE_DUENO_NUBE, idUsuario);
      googleButton.hidden = true;
      accountEntry.hidden = true;
      renderEstado();
      mostrarCentro();
      actualizarEstadoCuenta('Encontramos una partida reciente guardada aquí y la vamos a sincronizar con tu cuenta.');
      void sincronizarNubeAhora();
      return;
    }

    const apodoPrevio = cuenta.perfil?.nickname || perfil?.nombre || sesionOnline.user.user_metadata?.full_name || '';
    const apodoLimpio = String(apodoPrevio).replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
    mostrarPerfil();
    accountEntry.hidden = false;
    googleButton.hidden = true;
    profileForm.hidden = false;
    document.querySelector('#profile-title').textContent = 'Elige tu apodo';
    document.querySelector('#player-name').value = apodoLimpio;
    document.querySelector('#player-age').value = perfil?.edad || '';
    actualizarEstadoCuenta('Cuenta de Google conectada. Elige un apodo público para terminar y guardar tu progreso.');
  } catch (error) {
    console.error('No se pudo abrir la cuenta en línea.', error);
    if (localStorage.getItem(CLAVE_DUENO_NUBE) && perfil) {
      renderEstado();
      mostrarCentro();
      actualizarEstadoCuenta('La nube no está disponible. Tu partida sigue guardada en este dispositivo y se sincronizará al reconectar.');
      return;
    }
    mostrarAccesoOnline();
    actualizarEstadoCuenta(error.message || 'No pudimos conectar con tu cuenta. Comprueba la conexión e inténtalo de nuevo.');
  }
}

function serializarDatosPrivados() {
  return {
    game: juego.serializar(),
    profile: perfil ? { ...perfil } : null,
    cosmetics: datosCosmeticos(),
    achievements: [...logrosDesbloqueados],
  };
}

function programarGuardadoNube() {
  if (!NUBE_CONFIGURADA || !perfil || sincronizandoDesdeNube) return;
  if (localStorage.getItem(CLAVE_DUENO_NUBE)) localStorage.setItem(CLAVE_NUBE_SUCIO, '1');
  if (!sesionOnline?.user?.id) return;
  versionNube += 1;
  window.clearTimeout(temporizadorNube);
  temporizadorNube = window.setTimeout(() => { void sincronizarNubeAhora(); }, 650);
}

async function sincronizarNubeAhora() {
  if (!NUBE_CONFIGURADA || !sesionOnline?.user?.id || !perfil || sincronizandoDesdeNube) return;
  window.clearTimeout(temporizadorNube);
  if (sincronizacionEnCurso) return;
  sincronizacionEnCurso = true;
  try {
    while (versionGuardadaNube < versionNube) {
      const versionActual = versionNube;
      await guardarPartidaPrivadaOnline(serializarDatosPrivados());
      versionGuardadaNube = versionActual;
      if (versionActual === versionNube) localStorage.removeItem(CLAVE_NUBE_SUCIO);
      actualizarEstadoCuenta('Guardado privado sincronizado. Las estadísticas públicas esperan validación del servidor.');
    }
  } catch (error) {
    console.warn('La partida sigue guardada localmente; la sincronización se volverá a intentar.', error);
    actualizarEstadoCuenta('Sin conexión con la nube. Tu partida sigue guardada aquí y se sincronizará al volver a conectarte.');
    if (navigator.onLine) window.setTimeout(() => { if (versionGuardadaNube < versionNube) void sincronizarNubeAhora(); }, 8000);
  } finally {
    sincronizacionEnCurso = false;
  }
}

function crearTarjetaJugador(jugador, { tipo = 'leaderboard', relacion = null } = {}) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'social-player-card glass-card';
  const identidad = document.createElement('div');
  identidad.className = 'social-player-identity';
  const apodo = document.createElement('h4');
  apodo.textContent = jugador.nickname || 'Chef';
  const progresoVerificado = jugador.progress_verified === true;
  const nivel = document.createElement('strong');
  nivel.textContent = progresoVerificado ? 'Nivel ' + Number(jugador.current_level || 1) : 'Avance pendiente de validación';
  identidad.append(apodo, nivel);

  const avance = document.createElement('p');
  avance.className = 'social-player-progress';
  avance.textContent = progresoVerificado
    ? (Number(jugador.orders_completed) || 0) + ' / ' + (Number(jugador.orders_total) || 0) + ' pedidos de este nivel'
    : 'El servidor aún no ha validado las estadísticas de esta cuenta.';
  if (progresoVerificado && Number.isFinite(Number(jugador.weekly_orders))) {
    avance.textContent += ' · ' + Number(jugador.weekly_orders) + ' esta semana';
  }
  const monedas = document.createElement('p');
  monedas.className = 'social-player-coins';
  monedas.textContent = '🪙 ' + formatoMonedas.format(Number(jugador.coins) || 0);
  const detalles = document.createElement('div');
  detalles.className = 'social-player-details';
  detalles.append(avance);
  if (progresoVerificado) detalles.append(monedas);

  const insignias = document.createElement('div');
  insignias.className = 'social-player-achievements';
  const logrosPorId = new Map(crearLogros().map((logro) => [logro.id, logro]));
  const ids = Array.isArray(jugador.important_achievements) ? jugador.important_achievements : [];
  ids.filter((id) => LOGROS_PUBLICOS.has(id)).slice(0, 4).forEach((id) => {
    const logro = logrosPorId.get(id);
    if (!logro) return;
    const insignia = document.createElement('span');
    insignia.className = 'social-achievement-badge';
    insignia.textContent = logro.icono + ' ' + logro.titulo;
    insignia.title = logro.titulo;
    insignias.append(insignia);
  });
  if (!insignias.childElementCount) {
    const ninguno = document.createElement('span');
    ninguno.className = 'form-note';
    ninguno.textContent = progresoVerificado ? 'Sin logros destacados todavía' : 'Logros pendientes de validación';
    insignias.append(ninguno);
  }

  tarjeta.append(identidad, detalles, insignias);
  const boton = document.createElement('div');
  boton.className = 'social-player-actions';
  if (tipo === 'search') {
    const idRelacion = jugador.friendship_id || relacion?.friendship_id;
    const estadoRelacion = jugador.friendship_status || relacion?.status || null;
    const accion = document.createElement('button');
    accion.type = 'button';
    accion.className = 'cosmetic-button';
    if (estadoRelacion === 'accepted') {
      accion.textContent = '✓ Amigo';
      accion.disabled = true;
    } else if (estadoRelacion === 'pending') {
      accion.textContent = relacion?.recipient_id === sesionOnline?.user?.id ? 'Solicitud recibida' : 'Solicitud pendiente';
      accion.disabled = true;
    } else {
      accion.textContent = 'Agregar amigo';
      accion.addEventListener('click', async () => {
        accion.disabled = true;
        try {
          if (idRelacion) await eliminarAmistad(idRelacion);
          await solicitarAmistad(jugador.player_id);
          document.querySelector('#social-feedback').textContent = 'Solicitud enviada a ' + jugador.nickname + '.';
          await cargarPanelSocial();
          const query = document.querySelector('#player-search-input').value.trim();
          if (query) await ejecutarBusquedaJugadores(query);
        } catch (error) {
          accion.disabled = false;
          document.querySelector('#social-feedback').textContent = error.message;
        }
      });
    }
    boton.append(accion);
  } else if (tipo === 'incoming' && relacion) {
    const aceptar = document.createElement('button');
    aceptar.type = 'button';
    aceptar.className = 'cosmetic-button';
    aceptar.textContent = 'Aceptar';
    aceptar.addEventListener('click', async () => {
      aceptar.disabled = true;
      try {
        await responderSolicitudAmistad(relacion.friendship_id, true);
        await cargarPanelSocial();
      } catch (error) {
        aceptar.disabled = false;
        document.querySelector('#social-feedback').textContent = error.message;
      }
    });
    const rechazar = document.createElement('button');
    rechazar.type = 'button';
    rechazar.className = 'quiet-button';
    rechazar.textContent = 'Rechazar';
    rechazar.addEventListener('click', async () => {
      rechazar.disabled = true;
      try {
        await eliminarAmistad(relacion.friendship_id);
        await cargarPanelSocial();
      } catch (error) {
        rechazar.disabled = false;
        document.querySelector('#social-feedback').textContent = error.message;
      }
    });
    boton.append(aceptar, rechazar);
  } else if (tipo === 'friend' && relacion) {
    const eliminar = document.createElement('button');
    eliminar.type = 'button';
    eliminar.className = 'quiet-button';
    eliminar.textContent = 'Quitar amigo';
    eliminar.addEventListener('click', async () => {
      eliminar.disabled = true;
      try {
        await eliminarAmistad(relacion.friendship_id);
        await cargarPanelSocial();
      } catch (error) {
        eliminar.disabled = false;
        document.querySelector('#social-feedback').textContent = error.message;
      }
    });
    boton.append(eliminar);
  }
  if (boton.childElementCount) tarjeta.append(boton);
  return tarjeta;
}

function renderClasificacionActual() {
  renderListaJugadores(
    document.querySelector('#leaderboard-list'),
    periodoClasificacion === 'weekly' ? clasificacionSemanalActual : clasificacionHistoricaActual,
    'leaderboard',
  );
  const semanal = document.querySelector('#ranking-weekly-button');
  const historico = document.querySelector('#ranking-alltime-button');
  semanal.classList.toggle('selected', periodoClasificacion === 'weekly');
  historico.classList.toggle('selected', periodoClasificacion === 'all-time');
  semanal.setAttribute('aria-pressed', String(periodoClasificacion === 'weekly'));
  historico.setAttribute('aria-pressed', String(periodoClasificacion === 'all-time'));
}

function mostrarEstadoVacio(contenedor, texto) {
  const mensaje = document.createElement('p');
  mensaje.className = 'form-note social-empty';
  mensaje.textContent = texto;
  contenedor.replaceChildren(mensaje);
}

function renderListaJugadores(contenedor, jugadores, tipo) {
  contenedor.replaceChildren();
  if (!jugadores?.length) {
    mostrarEstadoVacio(contenedor, 'Todavía no hay jugadores para mostrar.');
    return;
  }
  jugadores.forEach((jugador) => contenedor.append(crearTarjetaJugador(jugador, { tipo, relacion: jugador.relacion })));
}

async function cargarPanelSocial() {
  const feedback = document.querySelector('#social-feedback');
  if (!NUBE_CONFIGURADA || !sesionOnline) {
    feedback.textContent = 'Conecta tu cuenta de Google para buscar amigos. La clasificación se activará tras la validación del servidor.';
    return;
  }
  feedback.textContent = 'Cargando amigos y clasificación…';
  try {
    const [relaciones, semanal, historica] = await Promise.all([
      cargarAmistades(),
      cargarClasificacionSemanal(),
      cargarClasificacion(),
    ]);
    clasificacionSemanalActual = semanal;
    clasificacionHistoricaActual = historica;
    const entrantes = relaciones.filter((item) => item.status === 'pending' && item.recipient_id === sesionOnline.user.id);
    const aceptadas = relaciones.filter((item) => item.status === 'accepted');
    const salientes = relaciones.filter((item) => item.status === 'pending' && item.requester_id === sesionOnline.user.id);
    const incomingList = document.querySelector('#incoming-friend-requests');
    const friendList = document.querySelector('#friend-list');
    const outgoingList = document.querySelector('#outgoing-friend-requests');
    renderListaJugadores(incomingList, entrantes.map((item) => ({
      player_id: item.other_user_id,
      nickname: item.nickname,
      current_level: item.current_level,
      orders_completed: item.orders_completed,
      orders_total: item.orders_total,
      important_achievements: item.important_achievements,
      coins: item.coins,
      progress_verified: item.progress_verified,
      friendship_id: item.friendship_id,
      relacion: item,
    })), 'incoming');
    friendList.replaceChildren();
    if (!aceptadas.length) mostrarEstadoVacio(friendList, 'Cuando agregues amigos, aparecerán aquí.');
    aceptadas.forEach((item) => friendList.append(crearTarjetaJugador({
      player_id: item.other_user_id,
      nickname: item.nickname,
      current_level: item.current_level,
      orders_completed: item.orders_completed,
      orders_total: item.orders_total,
      important_achievements: item.important_achievements,
      coins: item.coins,
      progress_verified: item.progress_verified,
    }, { tipo: 'friend', relacion: item })));
    renderListaJugadores(outgoingList, salientes.map((item) => ({
      player_id: item.other_user_id,
      nickname: item.nickname,
      current_level: item.current_level,
      orders_completed: item.orders_completed,
      orders_total: item.orders_total,
      important_achievements: item.important_achievements,
      coins: item.coins,
      progress_verified: item.progress_verified,
    })), 'leaderboard');
    renderClasificacionActual();
    feedback.textContent = 'Amigos actualizados. La clasificación se activará cuando el servidor valide las partidas.';
  } catch (error) {
    console.error('No se pudo cargar el panel social.', error);
    feedback.textContent = error.message || 'No se pudo cargar la clasificación. Inténtalo de nuevo.';
  }
}

async function ejecutarBusquedaJugadores(apodo) {
  const resultados = document.querySelector('#player-search-results');
  resultados.replaceChildren();
  if (!NUBE_CONFIGURADA || !sesionOnline) {
    mostrarEstadoVacio(resultados, 'Conecta tu cuenta para buscar jugadores.');
    return;
  }
  try {
    const jugadores = await buscarJugadores(apodo);
    renderListaJugadores(resultados, jugadores, 'search');
    if (!jugadores.length) mostrarEstadoVacio(resultados, 'No encontramos apodos que empiecen con «' + apodo + '».');
  } catch (error) {
    document.querySelector('#social-feedback').textContent = error.message;
  }
}


document.querySelector('#google-login-button').addEventListener('click', async () => {
  if (!NUBE_CONFIGURADA) return;
  actualizarEstadoCuenta('Abriendo Google…');
  try { await iniciarSesionGoogle(); }
  catch (error) { actualizarEstadoCuenta(error.message || 'No se pudo iniciar sesión con Google.'); }
});
document.querySelector('#sign-out-button').addEventListener('click', async () => {
  await sincronizarNubeAhora();
  await cerrarSesionOnline();
  sesionOnline = null;
  mostrarAccesoOnline();
});
document.querySelector('#player-search-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const apodo = document.querySelector('#player-search-input').value.trim();
  if (apodo.length < 3) return;
  document.querySelector('#social-feedback').textContent = 'Buscando jugadores…';
  await ejecutarBusquedaJugadores(apodo);
});
document.querySelector('#refresh-social-button').addEventListener('click', () => { void cargarPanelSocial(); });
document.querySelector('#ranking-weekly-button').addEventListener('click', () => elegirPeriodoClasificacion('weekly'));
document.querySelector('#ranking-alltime-button').addEventListener('click', () => elegirPeriodoClasificacion('all-time'));

document.querySelector('#generate-button').addEventListener('click', generarPieza);
hintButton.addEventListener('click', mostrarPista);
document.querySelector('#shop-moves-button').addEventListener('click', () => {
  const resultado = juego.comprarMovimientos();
  if (!resultado.ok) return;
  renderEstado();
  document.querySelector('#shop-feedback').textContent = '¡Listo! Se añadieron 5 movimientos a tu nivel actual.';
});
document.querySelector('#profile-image-input').addEventListener('change', async (event) => {
  const archivo = event.currentTarget.files?.[0];
  if (!archivo) return;
  const feedback = document.querySelector('#profile-feedback');
  feedback.textContent = 'Preparando tu imagen…';
  try {
    avatarTemporal = await convertirImagenPerfil(archivo);
    renderAvatarPerfil();
    feedback.textContent = 'Vista previa lista. Guarda los cambios para conservarla.';
  } catch (error) {
    avatarTemporal = null;
    event.currentTarget.value = '';
    feedback.textContent = error.message;
  }
});
document.querySelector('#remove-profile-image').addEventListener('click', () => {
  avatarTemporal = '';
  profileImageInput.value = '';
  renderAvatarPerfil();
  document.querySelector('#profile-feedback').textContent = 'Se usará el ícono de cocina al guardar.';
});
profileDetailsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  perfil = {
    ...perfil,
    descripcion: document.querySelector('#profile-description-input').value.trim().slice(0, 180),
    avatar: avatarTemporal === null ? perfil.avatar : avatarTemporal,
    avatarMode: avatarTemporal === null ? (perfil.avatarMode ?? (perfil.avatar ? 'imagen' : 'icono')) : avatarTemporal ? 'imagen' : 'icono',
  };
  avatarTemporal = null;
  guardarPerfil();
  renderPerfilVista();
  document.querySelector('#profile-feedback').textContent = 'Tu perfil se guardó en este dispositivo.';
});
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nombre = document.querySelector('#player-name').value.trim();
  const edad = Number(document.querySelector('#player-age').value);
  if (!nombre || nombre.length < 3 || nombre.length > 20 || !/^[A-Za-z0-9_]+$/.test(nombre)
      || !Number.isInteger(edad) || edad < 1 || edad > 120) return;

  const feedback = document.querySelector('#account-status');
  try {
    if (NUBE_CONFIGURADA && sesionOnline) {
      feedback.textContent = 'Preparando tu cuenta y guardando tu partida…';
      await crearPerfilOnline(nombre);
    }
    const perfilAnterior = perfil;
    perfil = {
      nombre,
      edad,
      descripcion: perfilAnterior?.descripcion || '',
      avatar: perfilAnterior?.avatar || '',
      avatarMode: perfilAnterior?.avatarMode || 'icono',
    };
    guardarPerfil();
    if (NUBE_CONFIGURADA && sesionOnline) {
      localStorage.setItem(CLAVE_DUENO_NUBE, sesionOnline.user.id);
      await sincronizarNubeAhora();
      feedback.textContent = 'Cuenta lista. El guardado privado se sincroniza; la clasificación espera validación del servidor.';
    }
    mostrarCentro();
  } catch (error) {
    feedback.textContent = error.message || 'No se pudo crear el perfil. Inténtalo de nuevo.';
  }
});

document.querySelector('#edit-profile-button').addEventListener('click', () => {
  profileScreen.hidden = true;
  hubScreen.hidden = false;
  gameScreen.hidden = true;
  mostrarVistaCentro('profile-view');
});
document.querySelector('#play-button').addEventListener('click', () => {
  hubScreen.hidden = true;
  gameScreen.hidden = false;
  if (juego.recompensado) {
    avanzarNivelCompletado();
    return;
  }
  renderEstado();
});
document.querySelector('#game-menu-button').addEventListener('click', () => {
  if (dialogElement.open) dialogElement.close();
  mostrarCentro();
});
hubScreen.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    mostrarVistaCentro(button.dataset.view);
    renderCentro();
  });
});
document.querySelector('#next-level-button').addEventListener('click', () => {
  dialogElement.close();
  avanzarNivelCompletado();
});
document.querySelector('#dialog-menu-button').addEventListener('click', () => {
  dialogElement.close();
  mostrarCentro();
});

document.querySelector('#restart-button').addEventListener('click', () => {
  if (!window.confirm('¿Reiniciar el progreso de la partida? Se borrarán el nivel, las monedas, las estrellas y el tablero. Tus marcos y estilos comprados se conservarán.')) return;
  juego.reiniciarPartida();
  seleccionada = null;
  pistaIndices = [];
  dialogElement.close();
  messageElement.textContent = 'Tu cocina está lista para empezar de nuevo.';
  renderEstado();
});

window.addEventListener('pagehide', guardarProgreso);
window.addEventListener('online', () => {
  if (versionGuardadaNube < versionNube) void sincronizarNubeAhora();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') guardarProgreso();
});

iniciarAnunciosH5();
void iniciarAplicacion();

