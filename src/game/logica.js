import { CASILLAS, crearPieza } from './modelos.js';

export function crearTablero(piezasIniciales = []) {
  if (piezasIniciales.length > CASILLAS) throw new RangeError('Hay más piezas que casillas disponibles.');
  return [...piezasIniciales, ...Array(CASILLAS - piezasIniciales.length).fill(null)];
}

export function combinar(tablero, indiceOrigen, indiceDestino) {
  validarTablero(tablero);
  if (indiceOrigen === indiceDestino) return { ok: false, motivo: 'misma-casilla', tablero };
  if (!indiceValido(indiceOrigen) || !indiceValido(indiceDestino)) return { ok: false, motivo: 'casilla-invalida', tablero };
  const origen = tablero[indiceOrigen];
  const destino = tablero[indiceDestino];
  if (!origen || !destino) return { ok: false, motivo: 'casilla-vacia', tablero };
  if (origen.familia !== destino.familia || origen.nivel !== destino.nivel) return { ok: false, motivo: 'piezas-distintas', tablero };
  if (origen.nivel >= 5) return { ok: false, motivo: 'nivel-maximo', tablero };

  const siguiente = [...tablero];
  siguiente[indiceOrigen] = null;
  const id = crearIdFusion(origen.id, destino.id, destino.familia, destino.nivel + 1);
  siguiente[indiceDestino] = crearPieza(destino.familia, destino.nivel + 1, id);
  return { ok: true, tablero: siguiente, pieza: siguiente[indiceDestino] };
}

export function generar(tablero, pieza) {
  validarTablero(tablero);
  const indice = tablero.findIndex((casilla) => casilla === null);
  if (indice === -1) return { ok: false, motivo: 'tablero-lleno', tablero };
  if (!pieza) throw new TypeError('Se necesita una pieza para generar.');
  const siguiente = [...tablero];
  siguiente[indice] = pieza;
  return { ok: true, tablero: siguiente, indice, pieza };
}

export function contarPiezas(tablero, familia, nivel) {
  validarTablero(tablero);
  return tablero.filter((pieza) => pieza?.familia === familia && pieza.nivel === nivel).length;
}

export function calcularMovimientosMinimos(tablero, pedidos) {
  validarTablero(tablero);
  let movimientosDeFusion = 0;
  let ingredientesBaseFaltantes = 0;
  for (const familia of ['pan', 'fruta']) {
    const pedidosPorNivel = Array(6).fill(0);
    const piezasPorNivel = Array(6).fill(0);
    pedidos.forEach((pedido) => {
      if (pedido.familia === familia && Number.isInteger(pedido.nivel) && pedido.nivel >= 1 && pedido.nivel <= 5) {
        pedidosPorNivel[pedido.nivel] += pedido.cantidad;
      }
    });
    tablero.forEach((pieza) => {
      if (pieza?.familia === familia) piezasPorNivel[pieza.nivel] += 1;
    });
    let faltanPiezasSiguienteNivel = 0;
    for (let nivel = 5; nivel >= 1; nivel -= 1) {
      const piezasNecesarias = pedidosPorNivel[nivel] + faltanPiezasSiguienteNivel * 2;
      faltanPiezasSiguienteNivel = Math.max(0, piezasNecesarias - piezasPorNivel[nivel]);
      if (nivel === 1) ingredientesBaseFaltantes += faltanPiezasSiguienteNivel;
      else movimientosDeFusion += faltanPiezasSiguienteNivel;
    }
  }
  return movimientosDeFusion + (ingredientesBaseFaltantes * 0.5);
}

export function puedeCompletarPedido(tablero, pedido) {
  return contarPiezas(tablero, pedido.familia, pedido.nivel) >= pedido.cantidad;
}

export function entregarPedido(tablero, pedido) {
  if (!puedeCompletarPedido(tablero, pedido)) return { ok: false, motivo: 'faltan-piezas', tablero };
  const siguiente = [...tablero];
  let porEntregar = pedido.cantidad;
  for (let i = 0; i < siguiente.length && porEntregar > 0; i += 1) {
    const pieza = siguiente[i];
    if (pieza?.familia === pedido.familia && pieza.nivel === pedido.nivel) {
      siguiente[i] = null;
      porEntregar -= 1;
    }
  }
  return { ok: true, tablero: siguiente };
}

function indiceValido(indice) {
  return Number.isInteger(indice) && indice >= 0 && indice < CASILLAS;
}

function validarTablero(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== CASILLAS) throw new TypeError(`El tablero debe tener ${CASILLAS} casillas.`);
}

function crearIdFusion(origenId, destinoId, familia, nivel) {
  const texto = `${origenId}\u0000${destinoId}`;
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fusion-${familia}-${nivel}-${(hash >>> 0).toString(36)}`;
}
