# Configurar cuentas en línea de Merge Cocina

La PWA usa Supabase Auth para la sesión de Google y PostgreSQL para sincronizar el progreso, buscar apodos, gestionar amistades y consultar las clasificaciones. El correo de Google nunca forma parte del perfil público.

## 1. Crear un proyecto de Supabase

Crea un proyecto en tu cuenta de Supabase. Conserva su URL y una clave pública Publishable key (o la clave anon heredada). La URL suele tener la forma https://<referencia-del-proyecto>.supabase.co.

En SQL Editor, abre y ejecuta el archivo:

supabase/migrations/20261004000000_online_accounts.sql

La migración crea perfiles con únicamente apodo y estadísticas públicas; una tabla de guardado privado protegida por RLS; solicitudes de amistad; y funciones limitadas para buscar jugadores, consultar clasificaciones y guardar actividad. El progreso privado solo lo puede leer la cuenta propietaria.

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
- En la clasificación semanal, cada pedido entregado suma un punto. En Histórico, el orden usa nivel, pedidos del nivel y monedas.
- Si se juega sin conexión, la partida local sigue funcionando y guarda los pedidos pendientes; al recuperar Internet, los manda a la cuenta. Los pedidos fuera de línea se registran en la semana en que se sincronizan.

La clasificación es social y sirve para comparar el avance. El cliente del juego participa en el envío de las estadísticas, así que esta primera versión no debe usarse para premios ni competencias con dinero.
