import { CASILLAS, crearPieza } from './modelos.js';
import { combinar as combinarPiezas, entregarPedido, generar, crearTablero, puedeCompletarPedido, calcularMovimientosMinimos } from './logica.js';
import { obtenerNivel } from '../data/niveles.js';

const COSTE_PAQUETE_MOVIMIENTOS = 300;

export class ControladorJuego {
  constructor({ nivelId = 1, monedas = 0, estrellas = 0 } = {}) {
    this.monedas = monedas;
    this.estrellas = estrellas;
    this.derrotasEnNivel = 0;
    this.siguienteFamilia = 'pan';
    this.iniciarNivel(nivelId);
  }

  iniciarNivel(nivelId) {
    const nivel = obtenerNivel(nivelId);
    if (!nivel) throw new RangeError('El nivel solicitado no existe.');
    this.nivel = nivel;
    this.tablero = crearTablero(nivel.piezasIniciales);
    this.pedidosRestantes = new Set(nivel.pedidos.map((pedido) => pedido.id));
    this.recompensado = false;
    this.derrotasEnNivel = 0;
    this.reiniciarMovimientos();
  }

  combinar(origen, destino) {
    if (this.movimientosRestantes < 1) return { ok: false, motivo: 'sin-movimientos', tablero: this.tablero };
    const resultado = combinarPiezas(this.tablero, origen, destino);
    if (!resultado.ok) {
      if (resultado.motivo !== 'piezas-distintas') return resultado;
      return { ...resultado, derrota: this.gastarMovimiento(1) };
    }
    this.tablero = resultado.tablero;
    return { ...resultado, derrota: this.gastarMovimiento(1) };
  }

  generar() {
    if (this.movimientosRestantes < 0.5) return { ok: false, motivo: 'sin-movimientos', tablero: this.tablero };
    const familia = this.familiaSugerida();
    const resultado = generar(this.tablero, crearPieza(familia, 1));
    if (!resultado.ok) return resultado;
    this.tablero = resultado.tablero;
    this.siguienteFamilia = familia === 'pan' ? 'fruta' : 'pan';
    return { ...resultado, familia, derrota: this.gastarMovimiento(0.5) };
  }

  familiaSugerida() {
    const deficits = ['pan', 'fruta'].map((familia) => {
      const unidadesEnTablero = this.tablero.reduce((total, pieza) => (
        pieza?.familia === familia ? total + 2 ** (pieza.nivel - 1) : total
      ), 0);
      const unidadesEnPedidos = this.nivel.pedidos
        .filter((pedido) => pedido.familia === familia && this.pedidosRestantes.has(pedido.id))
        .reduce((total, pedido) => total + pedido.cantidad * 2 ** (pedido.nivel - 1), 0);
      return { familia, deficit: Math.max(0, unidadesEnPedidos - unidadesEnTablero), unidadesEnTablero };
    });
    deficits.sort((a, b) => b.deficit - a.deficit || a.unidadesEnTablero - b.unidadesEnTablero);
    if (deficits[0].deficit !== deficits[1].deficit) return deficits[0].familia;
    return this.siguienteFamilia;
  }

  movimientosNecesarios() {
    const pedidos = this.nivel.pedidos.filter((pedido) => this.pedidosRestantes.has(pedido.id));
    return calcularMovimientosMinimos(this.tablero, pedidos);
  }

  comprarMovimientos({ cantidad = 5, coste = COSTE_PAQUETE_MOVIMIENTOS } = {}) {
    if (!Number.isInteger(cantidad) || cantidad < 1 || !Number.isInteger(coste) || coste < 0) {
      return { ok: false, motivo: 'paquete-invalido' };
    }
    if (this.monedas < coste) return { ok: false, motivo: 'monedas-insuficientes' };
    this.monedas -= coste;
    this.movimientosRestantes += cantidad;
    this.movimientosMaximos += cantidad;
    return { ok: true, cantidad, coste };
  }

  puedeEntregar(pedido) {
    return this.pedidosRestantes.has(pedido.id) && puedeCompletarPedido(this.tablero, pedido);
  }

  entregar(pedidoId) {
    const pedido = this.nivel.pedidos.find((item) => item.id === pedidoId);
    if (!pedido || !this.pedidosRestantes.has(pedidoId) || !puedeCompletarPedido(this.tablero, pedido)) {
      return { ok: false, motivo: 'faltan-piezas' };
    }
    const resultado = entregarPedido(this.tablero, pedido);
    if (!resultado.ok) return resultado;
    this.tablero = resultado.tablero;
    this.pedidosRestantes.delete(pedidoId);
    let recompensa = null;
    if (this.pedidosRestantes.size === 0 && !this.recompensado) {
      this.recompensado = true;
      recompensa = this.nivel.recompensa;
      this.monedas += recompensa.monedas;
      this.estrellas += recompensa.estrellas;
    }
    return { ok: true, recompensa, derrota: this.registrarDerrotaSiCorresponde() };
  }

  avanzarNivel() {
    if (!this.recompensado || this.nivel.id >= 8) return false;
    this.iniciarNivel(this.nivel.id + 1);
    return true;
  }

  empezarOtraVuelta() {
    if (!this.recompensado || this.nivel.id < 8) return false;
    this.iniciarNivel(1);
    return true;
  }

  reiniciarPartida() {
    this.monedas = 0;
    this.estrellas = 0;
    this.iniciarNivel(1);
  }

  serializar() {
    return {
      versionEconomia: 3,
      nivelId: this.nivel.id,
      monedas: this.monedas,
      estrellas: this.estrellas,
      tablero: this.tablero,
      pedidosRestantes: [...this.pedidosRestantes],
      siguienteFamilia: this.siguienteFamilia,
      movimientosRestantes: this.movimientosRestantes,
      movimientosMaximos: this.movimientosMaximos,
      derrotasEnNivel: this.derrotasEnNivel,
    };
  }

  restaurar(estado) {
    if (!estado || typeof estado !== 'object' || !Array.isArray(estado.tablero) || estado.tablero.length !== CASILLAS) {
      throw new TypeError('El progreso guardado no tiene un tablero válido.');
    }
    const versionEconomia = numeroSeguro(estado.versionEconomia);
    const monedasGuardadas = numeroSeguro(estado.monedas);
    const monedas = versionEconomia < 2
      ? monedasGuardadas * 10
      : versionEconomia === 2
        ? Math.floor(monedasGuardadas / 1000)
        : monedasGuardadas;
    const estrellas = numeroSeguro(estado.estrellas);
    this.iniciarNivel(estado.nivelId);
    this.tablero = estado.tablero.map((pieza) => {
      if (pieza === null) return null;
      if (!pieza || typeof pieza.id !== 'string') throw new TypeError('El progreso contiene una pieza inválida.');
      return crearPieza(pieza.familia, pieza.nivel, pieza.id);
    });
    if (!Array.isArray(estado.pedidosRestantes)) throw new TypeError('El progreso no contiene pedidos válidos.');
    const pedidosValidos = new Set(this.nivel.pedidos.map((pedido) => pedido.id));
    this.pedidosRestantes = new Set(estado.pedidosRestantes.filter((id) => pedidosValidos.has(id)));
    this.monedas = monedas;
    this.estrellas = estrellas;
    this.siguienteFamilia = estado.siguienteFamilia === 'fruta' ? 'fruta' : 'pan';
    this.recompensado = this.pedidosRestantes.size === 0;
    this.derrotasEnNivel = Math.min(1, numeroSeguro(estado.derrotasEnNivel));
    this.reiniciarMovimientos();
    if (Number.isFinite(estado.movimientosMaximos) && Number.isFinite(estado.movimientosRestantes)) {
      this.movimientosMaximos = normalizarMovimientos(estado.movimientosMaximos);
      this.movimientosRestantes = Math.min(this.movimientosMaximos, normalizarMovimientos(estado.movimientosRestantes));
    }
  }

  reiniciarMovimientos() {
    const pedidos = this.nivel.pedidos.filter((pedido) => this.pedidosRestantes.has(pedido.id));
    this.movimientosMaximos = calcularMovimientosMinimos(this.tablero, pedidos) + 5;
    this.movimientosRestantes = this.movimientosMaximos;
  }

  gastarMovimiento(cantidad = 1) {
    this.movimientosRestantes = Math.max(0, this.movimientosRestantes - cantidad);
    return this.registrarDerrotaSiCorresponde();
  }

  registrarDerrotaSiCorresponde() {
    if (this.movimientosRestantes > 0 || this.pedidosRestantes.size === 0) return null;
    const pedidosPendientes = this.nivel.pedidos.filter((pedido) => this.pedidosRestantes.has(pedido.id));
    if (pedidosPendientes.some((pedido) => this.puedeEntregar(pedido))) return null;
    if (this.movimientosNecesarios() === 0) return null;

    this.derrotasEnNivel += 1;
    const pedidosReiniciados = this.derrotasEnNivel >= 2;
    if (pedidosReiniciados) {
      this.pedidosRestantes = new Set(this.nivel.pedidos.map((pedido) => pedido.id));
      this.derrotasEnNivel = 0;
    }
    this.tablero = crearTablero(this.nivel.piezasIniciales);
    this.recompensado = false;
    this.siguienteFamilia = 'pan';
    this.reiniciarMovimientos();
    return { pedidosReiniciados, derrotas: pedidosReiniciados ? 2 : 1 };
  }
}

function numeroSeguro(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.floor(valor));
}

function normalizarMovimientos(valor) {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.floor(valor * 2 + 1e-9) / 2);
}
