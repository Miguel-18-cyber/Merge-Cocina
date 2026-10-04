# Merge-Cocina

Un juego muy sencillo, fácil y divertido que te permite pasar el tiempo libre que tienes.
Juego original de cocina para combinar comidas, creado como PWA con JavaScript y Vite.
El perfil (nombre y edad) y el progreso se guardan en el navegador con `localStorage`.
Un juego casual de cocina para combinar ingredientes, completar pedidos y pasar un rato entretenido.

## Perfil, movimientos y monedas

- El inicio pide nombre y edad; después abre el menú con Puzzle, Logros y Tienda.
- Cada combinación válida cuesta 1 movimiento; intentar combinar productos distintos también resta 1. Generar un ingrediente cuesta ½ movimiento. El nivel estima las acciones mínimas para sus pedidos y añade cinco movimientos de margen.
- Las pistas son gratis: resaltan una combinación útil o recomiendan el ingrediente que ayuda a preparar los pedidos pendientes.
- Generar ingredientes ya no usa una segunda barra de energía. El tipo de ingrediente generado se orienta a los pedidos que faltan.
- La pantalla principal muestra el avance del nivel; los logros incluyen una barra de progreso.
- La tienda ofrece 13 estilos de tablero, 11 marcos y 12 iconos de perfil. Los artículos desbloqueados y equipados se guardan aparte y sobreviven al reinicio de la partida.
- Completar el nivel 1 entrega 500 monedas; la recompensa aumenta 500 por nivel y suma 150 monedas adicionales después de cada bloque de cinco niveles. Completar una receta no gasta movimientos y conserva la recompensa hasta terminar todos los pedidos.
- Cinco movimientos extra cuestan 300 monedas. Los marcos y estilos comprables cuestan más de 500.000 monedas; al terminar el nivel 8 se puede comenzar otra vuelta y conservar el saldo.
- Los saldos de las versiones anteriores se ajustan automáticamente a esta escala de monedas.
- El perfil permite consultar nombre y edad, escribir una descripción, guardar una foto comprimida y equipar los marcos desbloqueados con monedas.
- El proyecto incluye configuración de Vite PWA y puede publicarse como sitio estático en Vercel con `pnpm run build` y salida `dist/`.
- Al quedarse sin movimientos se registra una derrota. La segunda derrota reinicia los pedidos del nivel actual; el nivel, las monedas y las estrellas se conservan.
- La tienda muestra nueve paquetes de monedas entre US$0,50 y US$200 con sus cantidades. Los botones siguen desactivados: falta integrar un proveedor de pagos y un backend que verifique cobros antes de acreditar monedas.

## Cuenta, progreso sincronizado y amigos

El proyecto incluye inicio de sesión con Google mediante Supabase, perfil público por apodo, guardado privado entre dispositivos, solicitudes de amistad, una clasificación semanal y otra histórica. Solo se publican el apodo, el nivel, el avance de pedidos, cuatro logros destacados y las monedas. Correo y edad nunca se incluyen en las consultas públicas. La clasificación semanal suma pedidos entregados y el histórico ordena por nivel, avance y monedas.

Para activar el servicio, sigue los pasos de [SUPABASE_SETUP.md](SUPABASE_SETUP.md): ejecutar la migración SQL, configurar el proveedor Google en Supabase y agregar las dos variables públicas a Vercel. Sin esas variables, el modo local continúa disponible. No agregues claves secretas a variables VITE_.

## Requisitos

- Node.js 20.19 o posterior.
- pnpm, disponible en el entorno de desarrollo.

## Comandos

```powershell
pnpm install
pnpm dev
pnpm test
pnpm icons
pnpm build
pnpm preview
```

El servidor de desarrollo muestra direcciones local y de red en la terminal. Para
abrir la versión de desarrollo desde un teléfono, conecta ambos dispositivos a
la misma red Wi-Fi y visita la dirección «Network» que muestra Vite (por ejemplo,
`http://192.168.x.x:5175`). Esta dirección funciona mientras el servidor siga
activo y la red permita conexiones entre dispositivos.

Para instalar la PWA y abrirla desde su icono en Android o iPhone, publica el contenido
de `dist/` en un hosting con HTTPS. En Safari de iPhone, usa Compartir → Añadir a
pantalla de inicio; en Android, usa el aviso de instalación o el menú del navegador.
El comando
`pnpm preview` sirve el build de producción, normalmente en `http://localhost:4173`.
El manifest y el service worker se generan al ejecutar `pnpm build`.
`pnpm icons` regenera los iconos PNG a partir de formas dibujadas con código.

Abre la página al menos una vez con conexión para guardar sus recursos sin conexión.

Cada navegador mantiene su propio progreso. El botón «Reiniciar progreso» lo
borra tras pedir confirmación.
