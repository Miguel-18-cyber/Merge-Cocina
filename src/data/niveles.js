import { crearPieza } from '../game/modelos.js';

const pedido = (id, familia, nivel, cantidad = 1) => ({ id, familia, nivel, cantidad });
const piezas = (...entradas) => entradas.map(([familia, nivel], indice) => crearPieza(familia, nivel, `inicio-${familia}-${nivel}-${indice}`));
const monedasPorNivel = (nivel) => (nivel * 500) + (Math.floor((nivel - 1) / 5) * 150);

export const NIVELES = Object.freeze([
  { id: 1, nombre: 'La primera merienda', pedidos: [pedido('p1', 'pan', 2), pedido('p2', 'fruta', 2)], recompensa: { monedas: monedasPorNivel(1), estrellas: 1 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['fruta', 1], ['fruta', 1]) },
  { id: 2, nombre: 'Una mesa colorida', pedidos: [pedido('p1', 'pan', 3), pedido('p2', 'fruta', 2, 2)], recompensa: { monedas: monedasPorNivel(2), estrellas: 1 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['pan', 2], ['fruta', 1], ['fruta', 1], ['fruta', 1]) },
  { id: 3, nombre: 'Hora de los jugos', pedidos: [pedido('p1', 'fruta', 3), pedido('p2', 'pan', 3)], recompensa: { monedas: monedasPorNivel(3), estrellas: 2 }, piezasIniciales: piezas(['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['pan', 1], ['pan', 1], ['pan', 2]) },
  { id: 4, nombre: 'Pan recién hecho', pedidos: [pedido('p1', 'pan', 4), pedido('p2', 'fruta', 3, 2)], recompensa: { monedas: monedasPorNivel(4), estrellas: 2 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['pan', 1], ['pan', 1], ['fruta', 1], ['fruta', 1], ['fruta', 2], ['fruta', 2]) },
  { id: 5, nombre: 'Dulce encuentro', pedidos: [pedido('p1', 'fruta', 4), pedido('p2', 'pan', 3, 2)], recompensa: { monedas: monedasPorNivel(5), estrellas: 2 }, piezasIniciales: piezas(['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 2], ['pan', 1], ['pan', 1], ['pan', 2]) },
  { id: 6, nombre: 'La gran bandeja', pedidos: [pedido('p1', 'pan', 4), pedido('p2', 'fruta', 4)], recompensa: { monedas: monedasPorNivel(6), estrellas: 3 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['pan', 1], ['pan', 1], ['pan', 2], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 2]) },
  { id: 7, nombre: 'Visita sorpresa', pedidos: [pedido('p1', 'pan', 5), pedido('p2', 'fruta', 4), pedido('p3', 'pan', 3, 2)], recompensa: { monedas: monedasPorNivel(7), estrellas: 3 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['pan', 1], ['pan', 1], ['pan', 2], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 2]) },
  { id: 8, nombre: 'La fiesta de la cocina', pedidos: [pedido('p1', 'pan', 5), pedido('p2', 'fruta', 5), pedido('p3', 'pan', 4), pedido('p4', 'fruta', 4)], recompensa: { monedas: monedasPorNivel(8), estrellas: 5 }, piezasIniciales: piezas(['pan', 1], ['pan', 1], ['pan', 1], ['pan', 1], ['pan', 2], ['pan', 2], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 1], ['fruta', 2], ['fruta', 2]) },
].map((nivel) => Object.freeze({ ...nivel, pedidos: Object.freeze(nivel.pedidos.map(Object.freeze)), recompensa: Object.freeze(nivel.recompensa), piezasIniciales: Object.freeze(nivel.piezasIniciales) })));

export function obtenerNivel(id) {
  return NIVELES.find((nivel) => nivel.id === id) ?? null;
}
