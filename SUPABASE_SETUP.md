# Configurar cuentas en línea de Merge Cocina

La PWA usa Supabase Auth para la sesión de Google y PostgreSQL para sincronizar el guardado privado, buscar apodos y gestionar amistades. El correo de Google nunca forma parte del perfil público. La publicación de estadísticas y las clasificaciones quedan protegidas hasta que un servidor valide el progreso.

## 1. Crear un proyecto de Supabase

Crea un proyecto en tu cuenta de Supabase. Conserva su URL y una clave pública Publishable key (o la clave anon heredada). La URL suele tener la forma https://<referencia-del-proyecto>.supabase.co.

En SQL Editor, abre y ejecuta el archivo:

supabase/migrations/20261004000000_online_accounts.sql

La primera migración crea las tablas y funciones base. Para el paso 2 de seguridad, el proyecto incluye además `supabase/migrations/20261005000000_secure_public_progress.sql`; cuando se active la configuración inicial de Supabase, ejecútala después de la migración base. Esta segunda migración limita el perfil público al apodo y al estado de validación, mueve la lectura del perfil propio a una función autenticada y hace que la PWA solo envíe el guardado privado. El guardado privado solo lo puede leer la cuenta propietaria.

Después de esas dos, ejecuta `supabase/migrations/20261008000000_admin_progress_controls.sql`. Esta migración habilita el panel administrativo y agrega un control en la base de datos para que los reinicios requieran una cuenta autorizada. La lista privada de administradores se inicializa con `urbanoespanamiguelangel@gmail.com`; la cuenta debe iniciar sesión con Google usando ese mismo correo confirmado. Si tu cuenta de Google usa otra dirección, cambia el correo inicial de la migración antes de ejecutarla o reemplázalo desde SQL Editor con:

```sql
insert into app_private.merge_cocina_admin_emails (email)
values (lower('tu-correo-de-google@example.com'))
on conflict (email) do nothing;
```

La tabla de administradores está en un esquema privado, sin acceso desde la PWA. Las operaciones de búsqueda y reinicio vuelven a validar el permiso dentro de Postgres. El reinicio borra el progreso y las puntuaciones de competencia de esa cuenta, conserva apodo, datos del perfil, cosméticos y récord personal, y publica un marcador sincronizado para impedir que una partida vieja restaure los datos.

## 2. Configurar «Continuar con Google»

1. En Google Cloud Console, crea un OAuth Client ID de tipo Web application.
2. Agrega como orígenes autorizados la dirección de producción https://merge-cocina.vercel.app y, para desarrollo local, http://localhost:5175.
3. En Supabase, abre Authentication → Sign In / Providers → Google y activa Google.
4. Copia el Callback URL que muestra Supabase. Agrégalo en Google Cloud como URI de redirección autorizada. Su forma es https://<referencia-del-proyecto>.supabase.co/auth/v1/callback.
5. Pega el Client ID y Client Secret de Google en el proveedor Google de Supabase.
6. En Authentication → URL Configuration, establece como Site URL https://merge-cocina.vercel.app y permite también esa dirección y http://localhost:5175 como Redirect URLs. Si Vercel asigna otro dominio de producción, agrega el dominio real.

Google solo se usa para verificar la cuenta. El juego no pide ni recibe la contraseña de Google. La sesión usa el flujo OAuth con PKCE.

## 3. Conectar la PWA

En Vercel, abre el proyecto y agrega estas variables para Production, Preview y Development:

- VITE_SUPABASE_URL: la URL de tu proyecto Supabase.
- VITE_SUPABASE_PUBLISHABLE_KEY: la Publishable key de Supabase.

Después, vuelve a desplegar la aplicación. Para desarrollo local, copia .env.example como .env.local, agrega los valores del proyecto y ejecuta pnpm dev.

La publishable key es visible en el navegador y está diseñada para usarse en el cliente junto con las políticas RLS de la migración. No pongas en una variable VITE_ la service_role key, una secret key de Supabase ni el Client Secret de Google. Los secretos de Google solo van en la configuración del proveedor de Supabase.

## 4. Qué se guarda y qué se muestra

- La cuenta puede restaurar en otro dispositivo el nivel, el tablero, los pedidos, las monedas, las estrellas, los logros, los cosméticos y los datos privados del perfil.
- El apodo se busca desde Amigos. Para reducir resultados accidentales, la búsqueda empieza al escribir 3 caracteres.
- Una solicitud recibida se puede aceptar o rechazar; las amistades se pueden quitar.
- El perfil público muestra apodo, nivel, pedidos completados del nivel actual, logros destacados y saldo de monedas. No muestra correo, edad, descripción ni foto.
- Las búsquedas pueden mostrar apodos; el nivel, monedas, pedidos y logros aparecen solo cuando el servidor los haya validado.
- Las clasificaciones semanal e histórica incluyen únicamente partidas verificadas. La PWA actual todavía no envía resultados a validación, así que ambas clasificaciones permanecen vacías y no deben usarse para competencias o premios.
- Si se juega sin conexión, la partida local sigue funcionando y sincroniza el guardado privado al recuperar Internet. La actividad local no se suma a la clasificación semanal.

`record_verified_order` queda reservado para un backend de confianza: requiere `service_role`, valida la estructura de las estadísticas y deduplica pedidos por UUID. La PWA no tiene acceso a esa clave ni a esa función. Falta crear e integrar el servidor que reproduzca las reglas de juego y publique recompensas verificadas; hasta entonces, las clasificaciones no participan en premios.
