import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const carpeta = new URL('../public/', import.meta.url);
await mkdir(carpeta, { recursive: true });

for (const tamanio of [192, 512]) {
  const pixeles = Buffer.alloc(tamanio * tamanio * 4);
  const escala = tamanio / 512;
  const pintar = (x, y, color, opacidad = 1) => {
    const px = Math.floor(x * escala);
    const py = Math.floor(y * escala);
    if (px < 0 || py < 0 || px >= tamanio || py >= tamanio) return;
    const indice = (py * tamanio + px) * 4;
    for (let canal = 0; canal < 3; canal += 1) {
      pixeles[indice + canal] = Math.round(color[canal] * opacidad + pixeles[indice + canal] * (1 - opacidad));
    }
    pixeles[indice + 3] = 255;
  };
  const circulo = (cx, cy, radio, color, opacidad = 1) => {
    for (let y = cy - radio; y <= cy + radio; y += 1) {
      for (let x = cx - radio; x <= cx + radio; x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radio ** 2) pintar(x, y, color, opacidad);
      }
    }
  };
  const poligono = (puntos, color) => {
    const xs = puntos.map(([x]) => x);
    const ys = puntos.map(([, y]) => y);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1) {
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
        let dentro = false;
        for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i, i += 1) {
          const [xi, yi] = puntos[i];
          const [xj, yj] = puntos[j];
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
        }
        if (dentro) pintar(x, y, color);
      }
    }
  };
  const linea = (x1, y1, x2, y2, ancho, color) => {
    const distancia = Math.hypot(x2 - x1, y2 - y1);
    const pasos = Math.ceil(distancia * escala * 1.5);
    for (let paso = 0; paso <= pasos; paso += 1) {
      const proporcion = pasos ? paso / pasos : 0;
      circulo(x1 + (x2 - x1) * proporcion, y1 + (y2 - y1) * proporcion, ancho / 2, color);
    }
  };
  const trazo = (puntos, ancho, color) => {
    for (let i = 1; i < puntos.length; i += 1) linea(...puntos[i - 1], ...puntos[i], ancho, color);
  };

  const noche = [11, 16, 38];
  for (let y = 0; y < tamanio; y += 1) {
    for (let x = 0; x < tamanio; x += 1) pintar(x / escala, y / escala, noche);
  }
  circulo(112, 112, 94, [255, 122, 89], 0.75);
  circulo(410, 390, 105, [108, 92, 231], 0.72);
  poligono([[120, 278], [366, 278], [344, 384], [315, 425], [192, 425], [162, 384]], [240, 201, 139]);
  trazo([[120, 278], [366, 278], [344, 384], [315, 425], [192, 425], [162, 384], [120, 278]], 15, [255, 243, 220]);
  trazo([[104, 270], [104, 252], [115, 237], [132, 228], [148, 226], [338, 226], [356, 234], [368, 252], [368, 270]], 20, [255, 243, 220]);
  trazo([[173, 211], [162, 192], [173, 175], [173, 156]], 16, [25, 195, 177]);
  trazo([[261, 211], [250, 192], [261, 175], [261, 156]], 16, [25, 195, 177]);
  trazo([[344, 211], [333, 192], [344, 175], [344, 156]], 16, [25, 195, 177]);

  const png = crearPng(tamanio, pixeles);
  await writeFile(new URL(`icon-${tamanio}.png`, carpeta), png);
}

function crearPng(tamanio, pixeles) {
  const fila = tamanio * 4 + 1;
  const datos = Buffer.alloc(fila * tamanio);
  for (let y = 0; y < tamanio; y += 1) {
    const destino = y * fila;
    datos[destino] = 0;
    pixeles.copy(datos, destino + 1, y * tamanio * 4, (y + 1) * tamanio * 4);
  }
  const encabezado = Buffer.alloc(13);
  encabezado.writeUInt32BE(tamanio, 0);
  encabezado.writeUInt32BE(tamanio, 4);
  encabezado[8] = 8;
  encabezado[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque('IHDR', encabezado),
    bloque('IDAT', deflateSync(datos)),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

function bloque(tipo, datos) {
  const nombre = Buffer.from(tipo);
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const suma = Buffer.alloc(4);
  suma.writeUInt32BE(crc32(Buffer.concat([nombre, datos])));
  return Buffer.concat([longitud, nombre, datos, suma]);
}

function crc32(datos) {
  let crc = 0xffffffff;
  for (const byte of datos) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
