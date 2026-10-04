const limite = (valor, maximo) => Math.min(Math.max(0, Math.floor(valor || 0)), maximo);

export function crearLogros({
  nivelId = 1,
  recompensado = false,
  estrellas = 0,
  monedas = 0,
  articulosDesbloqueados = 0,
} = {}) {
  const nivelesCompletados = Math.max(0, nivelId - 1) + (recompensado ? 1 : 0);
  const valores = {
    nivelesCompletados,
    nivelesDesbloqueados: Math.max(0, nivelId - 1),
    estrellas: Math.max(0, estrellas),
    monedas: Math.max(0, monedas),
    articulos: Math.max(0, articulosDesbloqueados),
  };

  const definiciones = [
    { id: 'primer-pedido', titulo: 'Primer pedido', descripcion: 'Completa tu primer nivel.', icono: '🍽️', meta: 1, medir: (estado) => estado.nivelesCompletados },
    { id: 'chef-en-camino', titulo: 'Chef en camino', descripcion: 'Avanza hasta desbloquear el nivel 3.', icono: '👩‍🍳', meta: 2, medir: (estado) => estado.nivelesDesbloqueados },
    { id: 'cocina-estrellada', titulo: 'Cocina estrellada', descripcion: 'Consigue 8 estrellas.', icono: '🌟', meta: 8, medir: (estado) => estado.estrellas },
    { id: 'chef-constante', titulo: 'Chef constante', descripcion: 'Completa 3 niveles.', icono: '🥣', meta: 3, medir: (estado) => estado.nivelesCompletados },
    { id: 'ruta-de-sabores', titulo: 'Ruta de sabores', descripcion: 'Completa 5 niveles.', icono: '🧑‍🍳', meta: 5, medir: (estado) => estado.nivelesCompletados },
    { id: 'gran-banquete', titulo: 'Gran banquete', descripcion: 'Completa los 8 niveles de la aventura.', icono: '🎉', meta: 8, medir: (estado) => estado.nivelesCompletados },
    { id: 'estrella-en-ascenso', titulo: 'Estrella en ascenso', descripcion: 'Consigue 5 estrellas.', icono: '✨', meta: 5, medir: (estado) => estado.estrellas },
    { id: 'cielo-estrellado', titulo: 'Cielo estrellado', descripcion: 'Consigue 15 estrellas.', icono: '🌌', meta: 15, medir: (estado) => estado.estrellas },
    { id: 'constelacion', titulo: 'Constelación de cocina', descripcion: 'Consigue 30 estrellas.', icono: '💫', meta: 30, medir: (estado) => estado.estrellas },
    { id: 'leyenda-estelar', titulo: 'Leyenda estelar', descripcion: 'Consigue 50 estrellas.', icono: '🏅', meta: 50, medir: (estado) => estado.estrellas },
    { id: 'primer-estilo', titulo: 'Un toque especial', descripcion: 'Desbloquea tu primer artículo de personalización.', icono: '🎨', meta: 1, medir: (estado) => estado.articulos },
    { id: 'coleccionista', titulo: 'Coleccionista', descripcion: 'Desbloquea 5 artículos de personalización.', icono: '🛍️', meta: 5, medir: (estado) => estado.articulos },
    { id: 'monedero-listo', titulo: 'Monedero listo', descripcion: 'Reúne 10.000 monedas.', icono: '🪙', meta: 10_000, medir: (estado) => estado.monedas },
    { id: 'gran-ahorro', titulo: 'Gran ahorro', descripcion: 'Reúne 100.000 monedas.', icono: '💰', meta: 100_000, medir: (estado) => estado.monedas },
    { id: 'tesoro-de-cocina', titulo: 'Tesoro de cocina', descripcion: 'Reúne 500.000 monedas.', icono: '👑', meta: 500_000, medir: (estado) => estado.monedas },
  ];

  return definiciones.map((logro) => {
    const actual = limite(logro.medir(valores), logro.meta);
    return { id: logro.id, titulo: logro.titulo, descripcion: logro.descripcion, icono: logro.icono, actual, meta: logro.meta, logrado: actual >= logro.meta };
  });
}
