const limitar = (valor, maximo) => Math.min(Math.max(0, Math.floor(valor || 0)), maximo);

const hitos = [
  { id: 'primer-pedido', titulo: 'Primer pedido', descripcion: 'Completa tu primer nivel.', icono: '🍽️', meta: 1, metrica: 'nivelesCompletados', seccion: 'Primeros pasos · niveles 1–4', tipo: 'Campaña', dificultad: 'Fácil' },
  { id: 'mesa-en-marcha', titulo: 'Mesa en marcha', descripcion: 'Completa 2 niveles de la aventura.', icono: '🥄', meta: 2, metrica: 'nivelesCompletados', seccion: 'Primeros pasos · niveles 1–4', tipo: 'Campaña', dificultad: 'Fácil' },
  { id: 'chef-en-camino', titulo: 'Chef en camino', descripcion: 'Desbloquea el nivel 3.', icono: '👩‍🍳', meta: 2, metrica: 'nivelesDesbloqueados', seccion: 'Primeros pasos · niveles 1–4', tipo: 'Campaña', dificultad: 'Fácil' },
  { id: 'recetas-iniciales', titulo: 'Recetas iniciales', descripcion: 'Completa los primeros 4 niveles.', icono: '🥣', meta: 4, metrica: 'nivelesCompletados', seccion: 'Primeros pasos · niveles 1–4', tipo: 'Campaña', dificultad: 'Media' },
  { id: 'primera-celebracion', titulo: 'Primera celebración', descripcion: 'Llega al nivel 5.', icono: '🎈', meta: 4, metrica: 'nivelesDesbloqueados', seccion: 'Festival de sabores · niveles 5–8', tipo: 'Campaña', dificultad: 'Media' },
  { id: 'dulce-encuentro', titulo: 'Dulce encuentro', descripcion: 'Completa el nivel 5.', icono: '🧁', meta: 5, metrica: 'nivelesCompletados', seccion: 'Festival de sabores · niveles 5–8', tipo: 'Campaña', dificultad: 'Media' },
  { id: 'gran-banquete', titulo: 'Gran banquete', descripcion: 'Completa los primeros 8 niveles.', icono: '🎉', meta: 8, metrica: 'nivelesCompletados', seccion: 'Festival de sabores · niveles 5–8', tipo: 'Campaña', dificultad: 'Difícil' },
  { id: 'brunch-familiar', titulo: 'Brunch familiar', descripcion: 'Completa el nivel 9.', icono: '🍓', meta: 9, metrica: 'nivelesCompletados', seccion: 'Ruta del huerto · niveles 9–12', tipo: 'Campaña', dificultad: 'Difícil' },
  { id: 'feria-del-huerto', titulo: 'Feria del huerto', descripcion: 'Desbloquea el nivel 13.', icono: '🥕', meta: 12, metrica: 'nivelesDesbloqueados', seccion: 'Ruta del huerto · niveles 9–12', tipo: 'Campaña', dificultad: 'Difícil' },
  { id: 'sabores-de-temporada', titulo: 'Sabores de temporada', descripcion: 'Completa los primeros 12 niveles.', icono: '🫐', meta: 12, metrica: 'nivelesCompletados', seccion: 'Ruta del huerto · niveles 9–12', tipo: 'Campaña', dificultad: 'Experto' },
  { id: 'banquete-del-jardin', titulo: 'Banquete del jardín', descripcion: 'Completa el nivel 15.', icono: '🍇', meta: 15, metrica: 'nivelesCompletados', seccion: 'Maestría · niveles 13–16', tipo: 'Campaña', dificultad: 'Experto' },
  { id: 'cocina-legendaria', titulo: 'Cocina legendaria', descripcion: 'Completa los 16 niveles de la aventura.', icono: '👑', meta: 16, metrica: 'nivelesCompletados', seccion: 'Maestría · niveles 13–16', tipo: 'Campaña', dificultad: 'Experto' },
  { id: 'estrella-en-ascenso', titulo: 'Estrella en ascenso', descripcion: 'Consigue 5 estrellas.', icono: '✨', meta: 5, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Fácil' },
  { id: 'cocina-estrellada', titulo: 'Cocina estrellada', descripcion: 'Consigue 8 estrellas.', icono: '🌟', meta: 8, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Fácil' },
  { id: 'cielo-estrellado', titulo: 'Cielo estrellado', descripcion: 'Consigue 15 estrellas.', icono: '🌌', meta: 15, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Media' },
  { id: 'constelacion', titulo: 'Constelación de cocina', descripcion: 'Consigue 30 estrellas.', icono: '💫', meta: 30, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Difícil' },
  { id: 'leyenda-estelar', titulo: 'Leyenda estelar', descripcion: 'Consigue 50 estrellas.', icono: '🏅', meta: 50, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Experto' },
  { id: 'cielo-de-plata', titulo: 'Cielo de plata', descripcion: 'Consigue 64 estrellas.', icono: '🌠', meta: 64, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Experto' },
  { id: 'universo-de-sabores', titulo: 'Universo de sabores', descripcion: 'Consigue 100 estrellas.', icono: '🌠', meta: 100, metrica: 'estrellas', seccion: 'Estrellas de cocina', tipo: 'Estrellas', dificultad: 'Experto' },
  { id: 'bolsillo-dulce', titulo: 'Bolsillo dulce', descripcion: 'Reúne 2.500 monedas.', icono: '🍬', meta: 2_500, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Fácil' },
  { id: 'monedero-listo', titulo: 'Monedero listo', descripcion: 'Reúne 10.000 monedas.', icono: '🪙', meta: 10_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Fácil' },
  { id: 'reserva-de-chef', titulo: 'Reserva de chef', descripcion: 'Reúne 50.000 monedas.', icono: '🏦', meta: 50_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Media' },
  { id: 'gran-ahorro', titulo: 'Gran ahorro', descripcion: 'Reúne 100.000 monedas.', icono: '💰', meta: 100_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Media' },
  { id: 'tesoro-de-cocina', titulo: 'Tesoro de cocina', descripcion: 'Reúne 500.000 monedas.', icono: '👑', meta: 500_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Difícil' },
  { id: 'boveda-dorada', titulo: 'Bóveda dorada', descripcion: 'Reúne 1.000.000 de monedas.', icono: '🏆', meta: 1_000_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Experto' },
  { id: 'imperio-de-sabores', titulo: 'Imperio de sabores', descripcion: 'Reúne 5.000.000 de monedas.', icono: '💎', meta: 5_000_000, metrica: 'monedas', seccion: 'Ahorro y monedas', tipo: 'Economía', dificultad: 'Experto' },
  { id: 'primer-estilo', titulo: 'Un toque especial', descripcion: 'Desbloquea tu primer artículo de personalización.', icono: '🎨', meta: 1, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Fácil' },
  { id: 'estilo-propio', titulo: 'Estilo propio', descripcion: 'Desbloquea 3 artículos de personalización.', icono: '🧵', meta: 3, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Fácil' },
  { id: 'coleccionista', titulo: 'Coleccionista', descripcion: 'Desbloquea 5 artículos de personalización.', icono: '🛍️', meta: 5, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Media' },
  { id: 'vitrina-de-chef', titulo: 'Vitrina de chef', descripcion: 'Desbloquea 8 artículos de personalización.', icono: '🖼️', meta: 8, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Media' },
  { id: 'galeria-de-sabores', titulo: 'Galería de sabores', descripcion: 'Desbloquea 12 artículos de personalización.', icono: '🪄', meta: 12, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Difícil' },
  { id: 'coleccion-completa', titulo: 'Colección de lujo', descripcion: 'Desbloquea 20 artículos de personalización.', icono: '💠', meta: 20, metrica: 'articulos', seccion: 'Colección y estilo', tipo: 'Colección', dificultad: 'Experto' },
];

export function crearLogros({
  nivelId = 1,
  recompensado = false,
  estrellas = 0,
  monedas = 0,
  articulosDesbloqueados = 0,
} = {}) {
  const valores = {
    nivelesCompletados: Math.max(0, nivelId - 1) + (recompensado ? 1 : 0),
    nivelesDesbloqueados: Math.max(0, nivelId - 1),
    estrellas: Math.max(0, estrellas),
    monedas: Math.max(0, monedas),
    articulos: Math.max(0, articulosDesbloqueados),
  };

  return hitos.map((logro) => {
    const actual = limitar(valores[logro.metrica], logro.meta);
    return {
      id: logro.id,
      titulo: logro.titulo,
      descripcion: logro.descripcion,
      icono: logro.icono,
      actual,
      meta: logro.meta,
      logrado: actual >= logro.meta,
      seccion: logro.seccion,
      tipo: logro.tipo,
      dificultad: logro.dificultad,
    };
  });
}
