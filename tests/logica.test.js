import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPieza, CASILLAS } from '../src/game/modelos.js';
import { NIVELES, obtenerNivel } from '../src/data/niveles.js';
import { combinar, crearTablero, contarPiezas, entregarPedido, generar, puedeCompletarPedido, calcularMovimientosMinimos } from '../src/game/logica.js';
import { ControladorJuego } from '../src/game/estado.js';

test('crea un tablero de 5 por 6 con piezas iniciales al inicio', () => {
  const pieza = crearPieza('pan', 1, 'semilla');
  const tablero = crearTablero([pieza]);
  assert.equal(tablero.length, CASILLAS);
  assert.equal(tablero[0], pieza);
  assert.equal(tablero.filter(Boolean).length, 1);
});

test('combina iguales y deja el resultado en la casilla destino', () => {
  const tablero = crearTablero([crearPieza('pan', 2, 'a'), crearPieza('pan', 2, 'b')]);
  const resultado = combinar(tablero, 0, 1);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.tablero[0], null);
  assert.deepEqual({ familia: resultado.tablero[1].familia, nivel: resultado.tablero[1].nivel }, { familia: 'pan', nivel: 3 });
  assert.equal(resultado.pieza.id, combinar(tablero, 0, 1).pieza.id, 'la lógica produce el mismo resultado con la misma entrada');
  assert.equal(tablero[0].nivel, 2, 'la entrada original no cambia');
});

test('rechaza combinar piezas diferentes y nivel máximo', () => {
  const distintas = crearTablero([crearPieza('pan', 1), crearPieza('fruta', 1)]);
  assert.equal(combinar(distintas, 0, 1).motivo, 'piezas-distintas');
  const maximas = crearTablero([crearPieza('pan', 5), crearPieza('pan', 5)]);
  assert.equal(combinar(maximas, 0, 1).motivo, 'nivel-maximo');
});

test('genera una pieza en la primera casilla vacía y detecta tablero lleno', () => {
  const tablero = crearTablero([crearPieza('fruta', 1)]);
  const nueva = crearPieza('pan', 1, 'nueva');
  const resultado = generar(tablero, nueva);
  assert.equal(resultado.indice, 1);
  assert.equal(resultado.tablero[1], nueva);
  assert.equal(generar(Array.from({ length: CASILLAS }, () => nueva)).motivo, 'tablero-lleno');
});

test('comprueba y entrega la cantidad exacta de un pedido', () => {
  const tablero = crearTablero([crearPieza('fruta', 2), crearPieza('fruta', 2), crearPieza('pan', 2)]);
  const pedido = { familia: 'fruta', nivel: 2, cantidad: 2 };
  assert.equal(contarPiezas(tablero, 'fruta', 2), 2);
  assert.equal(puedeCompletarPedido(tablero, pedido), true);
  const resultado = entregarPedido(tablero, pedido);
  assert.equal(resultado.ok, true);
  assert.equal(contarPiezas(resultado.tablero, 'fruta', 2), 0);
  assert.equal(contarPiezas(resultado.tablero, 'pan', 2), 1);
});

test('calcula acciones de receta con combinaciones, ingredientes faltantes y margen externo', () => {
  const inicio = crearTablero([crearPieza('pan', 1), crearPieza('pan', 1), crearPieza('fruta', 1), crearPieza('fruta', 1)]);
  const pedidos = [{ familia: 'pan', nivel: 2, cantidad: 1 }, { familia: 'fruta', nivel: 2, cantidad: 1 }];
  assert.equal(calcularMovimientosMinimos(inicio, pedidos), 2);
  const faltantes = crearTablero([crearPieza('pan', 1), crearPieza('pan', 2)]);
  assert.equal(calcularMovimientosMinimos(faltantes, [{ familia: 'pan', nivel: 3, cantidad: 1 }]), 2.5);
});

test('define dieciséis niveles y un reto final con pedidos de nivel cinco', () => {
  assert.equal(NIVELES.length, 16);
  assert.equal(obtenerNivel(8).pedidos.filter((item) => item.nivel === 5).length, 2);
  assert.equal(obtenerNivel(8).pedidos.length, 4);
  assert.equal(obtenerNivel(16).pedidos.filter((item) => item.nivel === 5).length, 2);
  assert.equal(obtenerNivel(16).pedidos.length, 6);
  assert.equal(obtenerNivel(99), null);
});

test('generar consume un movimiento y el ingrediente se elige según los pedidos pendientes', () => {
  const juego = new ControladorJuego();
  assert.equal(juego.movimientosMaximos, 7);
  const generado = juego.generar();
  assert.equal(generado.ok, true);
  assert.equal(generado.familia, 'pan');
  assert.equal(juego.movimientosRestantes, 6);
  assert.equal('energia' in juego.serializar(), false);
});

test('entregar los pedidos completa el nivel, paga una vez y permite avanzar', () => {
  const juego = new ControladorJuego();
  juego.combinar(0, 1);
  juego.combinar(2, 3);
  assert.equal(juego.entregar('p1').ok, true);
  const final = juego.entregar('p2');
  assert.deepEqual(final.recompensa, { monedas: 500, estrellas: 1 });
  assert.equal(juego.monedas, 500);
  assert.equal(juego.estrellas, 1);
  assert.equal(juego.avanzarNivel(), true);
  assert.equal(juego.nivel.id, 2);
});

test('gasta acciones al combinar y comprar cinco movimientos con monedas', () => {
  const juego = new ControladorJuego({ monedas: 1000 });
  assert.equal(juego.combinar(0, 2).ok, false, 'una combinación inválida no gasta movimiento');
  const fusion = juego.combinar(0, 1);
  assert.equal(fusion.ok, true);
  assert.equal(juego.movimientosRestantes, 6);
  assert.deepEqual(juego.comprarMovimientos(), { ok: true, cantidad: 5, coste: 300 });
  assert.equal(juego.movimientosRestantes, 11);
  assert.equal(juego.monedas, 700);
});

test('tras dos derrotas solo reinicia los pedidos del nivel y conserva monedas y estrellas', () => {
  const juego = new ControladorJuego({ monedas: 37, estrellas: 2 });
  for (let intento = 0; intento < 2; intento += 1) {
    for (let movimiento = 0; movimiento < 7; movimiento += 1) assert.equal(juego.generar().ok, true);
    assert.equal(juego.movimientosRestantes, 7);
    assert.equal(juego.derrotasEnNivel, intento === 0 ? 1 : 0);
    if (intento === 0) assert.deepEqual([...juego.pedidosRestantes], ['p1', 'p2']);
  }
  assert.equal(juego.nivel.id, 1);
  assert.equal(juego.monedas, 37);
  assert.equal(juego.estrellas, 2);
  assert.deepEqual([...juego.pedidosRestantes], ['p1', 'p2']);
});

test('serializa y restaura la partida guardada sin depender de la energía antigua', () => {
  const original = new ControladorJuego();
  original.generar();
  const guardado = JSON.parse(JSON.stringify(original.serializar()));
  guardado.energia = 2;
  guardado.segundosEnergia = 17;
  const reanudado = new ControladorJuego();
  reanudado.restaurar(guardado);
  assert.equal('energia' in reanudado, false);
  assert.equal(reanudado.tablero.filter(Boolean).length, 5);
  assert.equal(reanudado.movimientosRestantes, original.movimientosRestantes);
  assert.deepEqual([...reanudado.pedidosRestantes], ['p1', 'p2']);
});
