const CLAVE_SONIDO = 'merge-cocina-sonido-v1';

const EFECTOS = {
  fusion: [{ frecuencia: 523.25, inicio: 0, duracion: 0.13 }, { frecuencia: 783.99, inicio: 0.08, duracion: 0.18 }],
  ingrediente: [{ frecuencia: 440, inicio: 0, duracion: 0.12 }, { frecuencia: 587.33, inicio: 0.08, duracion: 0.14 }],
  error: [{ frecuencia: 196, inicio: 0, duracion: 0.18 }],
  pedido: [{ frecuencia: 587.33, inicio: 0, duracion: 0.12 }, { frecuencia: 739.99, inicio: 0.09, duracion: 0.12 }, { frecuencia: 880, inicio: 0.18, duracion: 0.2 }],
  nivel: [{ frecuencia: 523.25, inicio: 0, duracion: 0.13 }, { frecuencia: 659.25, inicio: 0.1, duracion: 0.13 }, { frecuencia: 783.99, inicio: 0.2, duracion: 0.13 }, { frecuencia: 1046.5, inicio: 0.3, duracion: 0.24 }],
};

let habilitado = leerPreferencia();
let contextoAudio = null;

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE_SONIDO) !== 'off';
  } catch {
    return true;
  }
}

export function sonidoActivado() {
  return habilitado;
}

export function alternarSonido() {
  habilitado = !habilitado;
  try {
    localStorage.setItem(CLAVE_SONIDO, habilitado ? 'on' : 'off');
  } catch {
    // La preferencia sigue vigente durante esta sesión aunque el almacenamiento no esté disponible.
  }
  return habilitado;
}

export function reproducirSonido(nombre) {
  if (!habilitado) return;
  const ConstructorAudio = globalThis.AudioContext || globalThis.webkitAudioContext;
  const notas = EFECTOS[nombre];
  if (!ConstructorAudio || !notas) return;

  try {
    contextoAudio ??= new ConstructorAudio();
    if (contextoAudio.state === 'suspended') void contextoAudio.resume().catch(() => {});

    const ahora = contextoAudio.currentTime;
    notas.forEach(({ frecuencia, inicio, duracion }) => {
      const oscilador = contextoAudio.createOscillator();
      const volumen = contextoAudio.createGain();
      const empieza = ahora + inicio;
      const termina = empieza + duracion;

      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(frecuencia, empieza);
      volumen.gain.setValueAtTime(0.0001, empieza);
      volumen.gain.exponentialRampToValueAtTime(0.035, empieza + 0.015);
      volumen.gain.exponentialRampToValueAtTime(0.0001, termina);
      oscilador.connect(volumen);
      volumen.connect(contextoAudio.destination);
      oscilador.start(empieza);
      oscilador.stop(termina + 0.02);
    });
  } catch {
    // El juego sigue funcionando si el navegador no puede reproducir audio.
  }
}
