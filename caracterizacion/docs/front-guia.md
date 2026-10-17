# Guía para el front (Vite → GitHub Pages)

* Front: `https://anarragan.github.io/iguana-front/`
* API: `https://iguana-resource-system-production.up.railway.app`
* Contrato de endpoints: [contrato-api.md](contrato-api.md) · máquina-legible: [openapi.yaml](openapi.yaml)

## 1. Cómo funciona (en corto)

1. Un administrador **invita al voluntario por correo** desde Supabase (Authentication → Users → Invite user).
2. El voluntario abre el enlace del correo, **crea su contraseña** y queda con sesión: Supabase le da un token.
3. El front manda ese token a la API en `Authorization: Bearer <token>`.
4. Cada voluntario solo ve y edita los hogares que él registró.

El front no guarda ningún secreto; solo estos tres valores, que son públicos:

```env
# .env.local  (desarrollo; en producción van como Variables de GitHub, ver §4)
VITE_SUPABASE_URL=https://spazzqpgndxzyeovprys.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYXp6cXBnbmR4enllb3ZwcnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODA2MTEsImV4cCI6MjEwNzY1NjYxMX0.HcsCsLRz5vgHHGbnA9nVXcyxXT-rYkXz9zz1Bs07Rjo
VITE_API_URL=https://iguana-resource-system-production.up.railway.app
```

## 2. Una sola configuración en Supabase

1. **Authentication → Sign In / Providers → Email**: desactiva **"Allow new users to sign up"**. Así solo entran las personas que invites.
2. **Authentication → URL Configuration**:
* **Site URL**: `https://anarragan.github.io/iguana-front/`
* **Redirect URLs**: la misma, más `http://localhost:5173/` para desarrollo.

Sin esto el enlace de la invitación no regresa al front.
3. **Invitar**: Authentication → Users → **Invite user** → correo del voluntario. Para dar de baja a alguien: borrarlo o bloquearlo ahí mismo (la API deja de aceptarlo en máximo 60 s).

No hay roles ni SQL adicional: cualquier persona invitada que haya aceptado puede usar el formulario.

## 3. Código

```bash
npm install @supabase/supabase-js
```

`src/api.js` (todo el acceso a Supabase y a la API en un solo archivo)
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const API = import.meta.env.VITE_API_URL;

// ---- Sesión ----
// El enlace de la invitación (o de "olvidé mi contraseña") llega con #access_token=…&type=invite|recovery en la URL.
// Se lee ANTES de que el router la toque, para saber si hay que pedir que cree su contraseña.
export const debeCrearPassword = /type=(invite|recovery)/.test(window.location.hash);
export const crearPassword = (password) => supabase.auth.updateUser({ password });
export const recuperarPassword = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL });
export const iniciarSesion = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const cerrarSesion = () => { sessionStorage.clear(); return supabase.auth.signOut(); };
export const alCambiarSesion = (fn) => supabase.auth.onAuthStateChange((_evento, sesion) => fn(sesion));

// ---- API ----
export class ErrorApi extends Error {
  constructor(estado, mensajes) { super(mensajes[0]); this.estado = estado; this.mensajes = mensajes; } // mensajes: siempre lista
}

async function api(ruta, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErrorApi(401, ['Inicia sesión']);
  const res = await fetch(`${API}${ruta}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401) await cerrarSesion(); // sesión vencida → el front vuelve al login
  if (!res.ok) throw new ErrorApi(res.status, [].concat(datos.message ?? 'Error inesperado'));
  return datos;
}

export const catalogos   = ()                  => api('/catalogos');
export const misHogares  = (estado)            => api(`/hogares${estado ? `?estado=${estado}` : ''}`);
export const crearHogar  = (datos)             => api('/hogares', { method: 'POST', body: datos });
export const guardarPaso = (ref, paso, datos)  => api(`/hogares/${ref}/${paso}`, { method: 'PUT', body: datos }); // composicion | vivienda | necesidades | atencion | contacto
export const progreso    = (ref)               => api(`/hogares/${ref}/progreso`);
export const completar   = (ref)               => api(`/hogares/${ref}/completar`, { method: 'POST' });
```

Pantalla de entrada (lógica mínima):
```js
import { supabase, debeCrearPassword, crearPassword, iniciarSesion } from './api.js';

const { data } = await supabase.auth.getSession();       // supabase-js ya leyó el token de la URL
if (data.session && debeCrearPassword) {
  // mostrar "Crea tu contraseña" → await crearPassword(nueva) → limpiar la URL → entrar al asistente
} else if (!data.session) {
  // mostrar el login → await iniciarSesion(email, password)
}
```

Uso típico del asistente:
```js
const cat = await catalogos();                       // arma las pantallas (opciones y etiquetas)
const hogar = await crearHogar({ autorizaTratamiento: true, versionConsentimiento: 'v1',
  direccion: 'Cra 80 # 50-10', nombreReferencia: 'María Gómez', telefonoContacto: '3001234567' });
await guardarPaso(hogar.ref, 'composicion', { respEsJefe: true, numPersonas: 4, ninosEdades: [3, 9] }); // al pulsar "Siguiente"
const estado = await progreso(hogar.ref);            // estado.faltantes, estado.alertas, estado.puedeCompletar
if (estado.puedeCompletar) await completar(hogar.ref);
```

Qué hacer con cada error (`ErrorApi.estado`; muestra siempre `mensajes` como lista):

| Estado | Acción |
|---|---|
| 400 | Mostrar los mensajes (reglas del formulario, o `faltantes` al completar). |
| 401 | Sesión vencida o correo sin confirmar → pantalla de login. |
| 404 | El hogar no existe o no es de este voluntario. |
| 409 | Ficha ya completa o dirección repetida → mostrar el mensaje. |
| 429 / 503 | "Espera un momento y reintenta". |

Reglas de seguridad del front: borradores solo en `sessionStorage` (se borran al completar y al cerrar sesión); no hagas `console.log` ni envíes a analítica los cuerpos de las peticiones; deja visible el botón "Cerrar sesión" (los dispositivos se comparten).

## 4. Requisitos de GitHub Pages

1. **Ruta base**: la app vive en `/iguana-front/`. En `vite.config.js`: `base: '/iguana-front/'`.
2. **Rutas sin hash + `404.html`**: copia `index.html` como `404.html` al compilar (el workflow de abajo ya lo hace) para que recargar una subruta no dé 404. **No uses rutas con hash** (`/#/…`): el enlace de la invitación usa el hash de la URL para el token y chocaría con el router.
3. **Variables al compilar**: GitHub → Settings → Secrets and variables → Actions → pestaña **Variables** → crear `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (los tres valores de §1). No subas ningún `.env`.
4. **Pages desde Actions**: Settings → Pages → Source: **GitHub Actions**.
5. En Railway debe estar `CORS_ORIGIN=https://anarragan.github.io` (solo el dominio).

`.github/workflows/pages.yml` en el repositorio del front:
```yaml
name: Desplegar en GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
          VITE_API_URL: ${{ vars.VITE_API_URL }}
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 5. Lista de verificación

- [ ] El sitio carga sin errores 404 en la consola.
- [ ] Invitar un correo de prueba → llega el correo → el enlace abre el front → pide crear contraseña → queda con sesión.
- [ ] Cerrar sesión e iniciar de nuevo con ese correo y contraseña funciona.
- [ ] Un correo que no fue invitado no puede registrarse.
- [ ] Sin sesión, ninguna pantalla llama a la API.
- [ ] Crear hogar → guardar cada paso → completar; aparece en la lista.
- [ ] Un segundo voluntario no ve ese hogar.
- [ ] No hay errores de CORS en la pestaña Red.
