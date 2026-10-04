export const COLUMNAS = 5;
export const FILAS = 6;
export const CASILLAS = COLUMNAS * FILAS;
export const FAMILIAS = Object.freeze({
  pan: Object.freeze([
    { nombre: 'Semilla', emoji: '🌱' },
    { nombre: 'Harina', emoji: '🌾' },
    { nombre: 'Masa', emoji: '🥣' },
    { nombre: 'Pan', emoji: '🍞' },
    { nombre: 'Sándwich', emoji: '🥪' },
  ]),
  fruta: Object.freeze([
    { nombre: 'Flor', emoji: '🌼' },
    { nombre: 'Fruta', emoji: '🍓' },
    { nombre: 'Jugo', emoji: '🧃' },
    { nombre: 'Postre', emoji: '🍮' },
    { nombre: 'Pastel', emoji: '🎂' },
  ]),
});

export function crearPieza(familia, nivel, id = globalThis.crypto?.randomUUID?.() ?? `${familia}-${nivel}-${Date.now()}-${Math.random()}`) {
  if (!FAMILIAS[familia] || nivel < 1 || nivel > 5) throw new RangeError('La familia o el nivel de la pieza no es válido.');
  return Object.freeze({ id, familia, nivel });
}

export function nombrePieza(familia, nivel) {
  const definicion = FAMILIAS[familia]?.[nivel - 1];
  if (!definicion) throw new RangeError('La familia o el nivel de la pieza no es válido.');
  return definicion.nombre;
}

export function emojiPieza(familia, nivel) {
  const definicion = FAMILIAS[familia]?.[nivel - 1];
  if (!definicion) throw new RangeError('La familia o el nivel de la pieza no es válido.');
  return definicion.emoji;
}
