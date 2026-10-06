# Guía de publicación de Merge Cocina

## Publicación estática en Vercel

1. Conecta el repositorio `Miguel-18-cyber/Merge-Cocina` a Vercel y selecciona la rama que quieras publicar.
2. Usa `pnpm install` como instalación, `pnpm run build` como comando de build y `dist` como directorio de salida. El proyecto usa Vite.
3. Habilita HTTPS en el dominio. El service worker y la instalación PWA necesitan un origen seguro (localhost también sirve durante desarrollo).
4. Abre la URL publicada en Android o iPhone y añade Merge Cocina a la pantalla de inicio desde el menú del navegador.

## Variables públicas del frontend

Si se habilita el inicio con Google, configura en Vercel las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (o la clave `anon` heredada). Son claves públicas del cliente; nunca pongas una `service_role` ni secretos en variables `VITE_`.

Configura también el proveedor Google y las URL de redirección permitidas en Supabase para los dominios de producción y vista previa que usarás.

## Bloqueos de seguridad antes de abrir funciones sociales

- No actives competencias, premios ni clasificaciones basadas en monedas o nivel hasta que una función de servidor valide las partidas y las recompensas.
- La migración `supabase/migrations/20261005000000_secure_public_progress.sql` depende de `20261004000000_online_accounts.sql`. Revisa y aplica las migraciones en orden cuando se habilite la conexión de Supabase. Esta rama no cambia la configuración de un proyecto Supabase.
- El guardado entre dispositivos contiene el progreso privado de la cuenta. Las copias JSON descargadas son archivos locales sensibles: consérvalas de forma privada.

## Pagos y anuncios

- Los paquetes de moneda con precio en dólares siguen desactivados. Para venderlos se necesita un proveedor de pagos y un backend que verifique el cobro antes de acreditar saldo; nunca se debe confiar en una confirmación enviada por el navegador.
- Los anuncios intersticiales H5 se solicitan cada dos niveles. Comprueba el inventario, consentimiento y configuración del editor de AdSense antes de mostrar anuncios a usuarios reales.

## Reto diario y copias

- El reto se completa al acabar un nivel, con fecha de Lima. El modo local entrega 250 monedas al día. En una cuenta conectada, el marcador se conserva pero no entrega monedas hasta que un servidor valide el premio.
- La copia JSON se descarga desde Mi perfil. Restaurarla sustituye el progreso actual; no contiene correo, sesión de Google, perfil, descripción ni imagen.

## Revisión final

Antes de anunciar una versión, genera el build en el entorno del proyecto, abre el sitio en escritorio y móvil, comprueba la instalación/offline de la PWA y verifica que cualquier función online use las variables del entorno correcto. En este trabajo no se publicó ni se activó un despliegue.