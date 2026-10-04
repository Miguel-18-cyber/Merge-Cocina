export const TEMA_PREDETERMINADO = 'clasico';
export const MARCO_PERFIL_PREDETERMINADO = 'perfil-clasico';
export const ICONO_PERFIL_PREDETERMINADO = 'chef-clasica';

export const COSMETICOS = Object.freeze([
  { id: 'clasico', nombre: 'Madera clara', categoria: 'Marco de tablero', descripcion: 'Madera cálida y luminosa para empezar.', icono: '🪵', muestra: ['🍞', '🍓', '🥐'], acento: '#d5b98b', fondo: '#54412f', precio: 0 },
  { id: 'huerto', nombre: 'Huerto alegre', categoria: 'Jardín', descripcion: 'Verdes frescos, hojas y luz de jardín.', icono: '🌿', muestra: ['🌾', '🥕', '🍅'], acento: '#8fca91', fondo: '#1d4d3c', precio: 600000 },
  { id: 'fresa', nombre: 'Fresa con crema', categoria: 'Dulce', descripcion: 'Rosa frambuesa con detalles cremosos.', icono: '🍓', muestra: ['🍓', '🍰', '🍨'], acento: '#ff9bb5', fondo: '#692e65', precio: 1100000 },
  { id: 'noche', nombre: 'Noche estrellada', categoria: 'Fantasía', descripcion: 'Violeta profundo con destellos nocturnos.', icono: '🌙', muestra: ['🌙', '🫐', '✨'], acento: '#b6a9ff', fondo: '#242552', precio: 1800000 },
  { id: 'dorado', nombre: 'Chef dorado', categoria: 'Edición especial', descripcion: 'Reflejos de oro para una cocina legendaria.', icono: '👑', muestra: ['👑', '🥇', '⭐'], acento: '#ffd574', fondo: '#6d4527', precio: 3000000 },
  { id: 'marino', nombre: 'Bahía turquesa', categoria: 'Océano', descripcion: 'Azules de agua clara y espuma brillante.', icono: '🐚', muestra: ['🐚', '🐟', '🌊'], acento: '#71e1e2', fondo: '#123f67', precio: 720000 },
  { id: 'lavanda', nombre: 'Jardín de lavanda', categoria: 'Floral', descripcion: 'Lilas suaves y tonos de uva.', icono: '🪻', muestra: ['🪻', '🫐', '🍇'], acento: '#d5aaff', fondo: '#50336c', precio: 850000 },
  { id: 'citrico', nombre: 'Cítricos del sol', categoria: 'Tropical', descripcion: 'Amarillo limón, naranja y verde lima.', icono: '🍋', muestra: ['🍋', '🍊', '🥝'], acento: '#ffd25f', fondo: '#915024', precio: 950000 },
  { id: 'atardecer', nombre: 'Atardecer dulce', categoria: 'Cálido', descripcion: 'Coral y durazno bajo una luz dorada.', icono: '🌇', muestra: ['🌇', '🍑', '🍯'], acento: '#ff9a83', fondo: '#693858', precio: 1250000 },
  { id: 'caramelo', nombre: 'Caramelo tostado', categoria: 'Postres', descripcion: 'Cacao, café y caramelo en tonos acogedores.', icono: '🍮', muestra: ['🍮', '🍫', '☕'], acento: '#d89b6b', fondo: '#422c38', precio: 1350000 },
  { id: 'esmeralda', nombre: 'Esmeralda fresca', categoria: 'Huerto', descripcion: 'Verde joya con pequeños reflejos de menta.', icono: '🥑', muestra: ['🥑', '🌱', '🥒'], acento: '#72e3b1', fondo: '#14504b', precio: 1500000 },
  { id: 'caramelos', nombre: 'Nube de caramelos', categoria: 'Dulce', descripcion: 'Colores de feria, algodón y confites.', icono: '🍭', muestra: ['🍬', '🍭', '🧁'], acento: '#ff9fc9', fondo: '#613a87', precio: 1650000 },
  { id: 'galaxia', nombre: 'Galaxia de azúcar', categoria: 'Fantasía', descripcion: 'Azul espacial, estrellas y polvo cósmico.', icono: '🌌', muestra: ['🌌', '🪐', '🌠'], acento: '#9c91ff', fondo: '#21264f', precio: 2200000 },
]);

export const MARCOS_PERFIL = Object.freeze([
  { id: 'perfil-clasico', nombre: 'Marco clásico', descripcion: 'Borde sencillo para tu foto o personaje.', icono: '👤', acento: '#acb5d1', fondo: '#343d61', precio: 0 },
  { id: 'perfil-huerto', nombre: 'Marco de huerto', descripcion: 'Hojas verdes con aire de jardín.', icono: '🌿', acento: '#9ce6a1', fondo: '#1d4d3c', precio: 650000 },
  { id: 'perfil-dorado', nombre: 'Marco dorado', descripcion: 'Aro brillante para tu perfil.', icono: '👑', acento: '#ffd574', fondo: '#6d4527', precio: 1500000 },
  { id: 'perfil-marino', nombre: 'Marco de coral', descripcion: 'Olas turquesa con conchas marinas.', icono: '🐚', acento: '#71e1e2', fondo: '#123f67', precio: 720000 },
  { id: 'perfil-lavanda', nombre: 'Marco lavanda', descripcion: 'Flores lilas y brillo suave.', icono: '🪻', acento: '#d5aaff', fondo: '#50336c', precio: 780000 },
  { id: 'perfil-coral', nombre: 'Marco coral', descripcion: 'Tonos rosados de una puesta de sol.', icono: '🪸', acento: '#ff9a83', fondo: '#693858', precio: 850000 },
  { id: 'perfil-arcoiris', nombre: 'Marco arcoíris', descripcion: 'Un aro alegre con todos los colores.', icono: '🌈', acento: '#ff9fc9', fondo: '#613a87', precio: 950000 },
  { id: 'perfil-floral', nombre: 'Marco floreado', descripcion: 'Pequeñas flores alrededor del retrato.', icono: '🌼', acento: '#ffd25f', fondo: '#915024', precio: 1100000 },
  { id: 'perfil-cristal', nombre: 'Marco de cristal', descripcion: 'Facetas azules y reflejos de hielo.', icono: '💎', acento: '#9ce5ff', fondo: '#234c7c', precio: 1250000 },
  { id: 'perfil-galaxia', nombre: 'Marco galáctico', descripcion: 'Un halo cósmico con estrellas violetas.', icono: '🌌', acento: '#9c91ff', fondo: '#21264f', precio: 1450000 },
  { id: 'perfil-neon', nombre: 'Marco neón', descripcion: 'Doble resplandor eléctrico en azul y rosa.', icono: '💠', acento: '#74eaff', fondo: '#3f266f', precio: 1700000 },
]);

export const ICONOS_PERFIL = Object.freeze([
  { id: 'chef-clasica', nombre: 'Chef clásica', emoji: '👩‍🍳', precio: 0 },
  { id: 'chef-maestro', nombre: 'Chef maestro', emoji: '👨‍🍳', precio: 550000 },
  { id: 'chef-creativo', nombre: 'Chef creativo', emoji: '🧑‍🍳', precio: 600000 },
  { id: 'gatito', nombre: 'Gatito pastelero', emoji: '🐱', precio: 650000 },
  { id: 'zorrito', nombre: 'Zorrito cocinero', emoji: '🦊', precio: 700000 },
  { id: 'panda', nombre: 'Panda repostero', emoji: '🐼', precio: 750000 },
  { id: 'ranita', nombre: 'Ranita del huerto', emoji: '🐸', precio: 800000 },
  { id: 'conejito', nombre: 'Conejito dulce', emoji: '🐰', precio: 850000 },
  { id: 'osito', nombre: 'Osito panadero', emoji: '🐻', precio: 900000 },
  { id: 'unicornio', nombre: 'Unicornio mágico', emoji: '🦄', precio: 950000 },
  { id: 'robot', nombre: 'Robot de cocina', emoji: '🤖', precio: 1000000 },
  { id: 'dinosaurio', nombre: 'Dinosaurio chef', emoji: '🦖', precio: 1100000 },
]);
