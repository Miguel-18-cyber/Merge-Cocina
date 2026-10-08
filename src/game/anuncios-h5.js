const CLIENT_ID = 'ca-pub-3934791251127084';
let inicializado = false;
let apiLista = false;

export function iniciarAnunciosH5() {
  if (inicializado || typeof window === 'undefined') return;
  inicializado = true;

  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adConfig = (opciones) => window.adsbygoogle.push(opciones);

  let script = document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="]');
  if (!script) {
    script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    if (import.meta.env.DEV) script.dataset.adbreakTest = 'on';
    document.head.append(script);
  }
  script.addEventListener('error', () => {
    console.warn('No se pudo cargar la API de anuncios H5; el juego seguirá sin anuncios.');
  }, { once: true });

  window.adConfig({
    preloadAdBreaks: 'auto',
    sound: 'off',
    onReady: () => { apiLista = true; },
  });
}

export function mostrarAnuncioCadaDosNiveles(nivelCompletado, continuar) {
  let continuado = false;
  const seguir = () => {
    if (continuado) return;
    continuado = true;
    continuar();
  };

  if (nivelCompletado % 2 !== 0 || !apiLista || typeof window.adBreak !== 'function') {
    seguir();
    return;
  }

  try {
    window.adBreak({
      type: 'next',
      name: `despues-del-nivel-${nivelCompletado}`,
      adBreakDone: seguir,
    });
  } catch (error) {
    console.warn('El anuncio intersticial se omitió; el nivel continuará.', error);
    seguir();
  }
}
