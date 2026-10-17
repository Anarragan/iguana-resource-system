# Contrato de la API – Caracterización La Iguaná

La API **solo recolecta**. Los voluntarios envían las respuestas de **una ficha por hogar**, paso a paso, y la API devuelve únicamente **avance, qué falta y alertas calculadas**. **No existe ningún endpoint que devuelva nombres, direcciones, teléfonos ni las respuestas de una familia**: eso se consulta en la base de datos, con las vistas de coordinación (§6).

JSON en `camelCase`. Toda petición lleva `Authorization: Bearer <token>` con el token de sesión de Supabase Auth del voluntario (un administrador lo invita por correo desde Supabase y él crea su contraseña) (excepto `GET /salud`). Cómo obtenerlo y cómo configurar el front: [front-guia.md](front-guia.md). Versión máquina-legible: [openapi.yaml](openapi.yaml). Las opciones de las listas **nunca se escriben a mano en el front**: salen de `GET /catalogos`.

## 1. Qué NO se le pide a quien aplica

| Dato | Qué hace el sistema |
|---|---|
| Código `IG-0001` | Lo asigna la base. Es para decirlo en voz alta; **las rutas usan `ref`** (uuid), que no se puede adivinar. |
| Nº de niños | Es la cantidad de edades en `ninosEdades`. |
| Total de daño | Se calcula (`resumen.totalDano`). |
| Las 4 alertas de seguimiento urgente | Se calculan de lo respondido (`alertas`). No son casillas. |
| Fecha de aplicación | Hoy por defecto (no admite fecha futura). |
| Versión del consentimiento | Constante del front (ej. `"v1"`). |
| Quién aplica | Sale de la sesión (correo del voluntario). **No se envía**; si mandas `aplicadaPor` responde 400. |
| Qué falta para completar | La base lo dice (`faltantes`); el front no duplica esa lógica. |

## 2. Flujo

```
GET  /catalogos                       → arma el formulario
POST /hogares                         → Momento cero (consentimiento + contacto) → { ref, codigo, … }
PUT  /hogares/:ref/composicion        → Mód.1 (quién responde, cuántas personas, escolaridad)
PUT  /hogares/:ref/vivienda           → Mód.2 (vivienda y daños 0-4)
PUT  /hogares/:ref/necesidades        → Mód.3 (qué necesitan, lo más urgente, mascotas, apoyo emocional)
PUT  /hogares/:ref/atencion           → Mód.4 (quién ha pasado, ayudas que dicen haber recibido)
PUT  /hogares/:ref/contacto           → corregir dirección/nombre/teléfono (solo escribe)
GET  /hogares/:ref/progreso           → pasos hechos, faltantes, alertas
POST /hogares/:ref/completar          → cierra (400 con la lista si falta algo)
GET  /hogares?estado=&limite=&desde=   → avance de TUS hogares (sin datos personales)
GET  /salud                           → { "estado": "ok" } (público, para el despliegue)
```

* Cada `PUT` **reemplaza su paso completo**: lo que no envíes queda vacío. Se puede volver atrás y reenviar.
* **Guarda al pulsar "Siguiente"** y conserva el borrador en el dispositivo (la API no devuelve lo ya contestado; es a propósito, §5).
* En `borrador` se puede editar; después responde `409`.
* Cada respuesta de `POST`/`PUT` trae el **avance actualizado** (mismo formato de §3): úsalo para la barra de progreso y la pantalla de cierre.

**Obligatorio para completar** (la base lo exige): datos de contacto, `respEsJefe`, `numPersonas`, `pernocta` y los 8 daños. Todo lo demás es opcional.

## 3. Respuesta de avance

```json
{
  "ref": "dd148b3f-73a3-4a59-b3b8-c5ae0c65f5a9",
  "codigo": "IG-0002",
  "estado": "borrador",
  "sector": "Zona alta",
  "fechaAplicacion": "2026-10-17",
  "aplicadaPor": "Ana",
  "actualizadoEn": "2026-10-17T20:18:24.246Z",
  "pasos": { "contacto": true, "composicion": true, "vivienda": true, "necesidades": true, "atencion": false },
  "faltantes": [],
  "puedeCompletar": true,
  "resumen": { "numPersonas": 4, "ninos": 2, "adultosMayores": 1, "totalDano": 11 },
  "alertas": { "duermeEnRiesgo": false, "urgenteSalud": false, "urgenteAguaAlimento": true, "electricaRiesgo": false },
  "requiereSeguimiento": true
}
```

`faltantes` son frases listas para mostrar (p. ej. `"vivienda: dónde pernoctó la familia"`). `alertas` se muestran en solo lectura en la pantalla de cierre y se resaltan si alguna es `true`; son parciales hasta tener todas las respuestas.

Cada voluntario solo ve y edita los hogares que creó (de los ajenos responde `404`). `GET /hogares` devuelve una lista de objetos con `ref, codigo, estado, sector, fechaAplicacion, aplicadaPor, actualizadoEn, pasos, requiereSeguimiento` (ordenados por última actualización).

## 4. Endpoints

### `GET /catalogos`
Opciones con `{ codigo, etiqueta }` para cada pregunta: `triestado`, `generos`, `materialParedes`, `nivelAgua`, `medioAlerta`, `pernocta`, `ingresos`, `lodo`, `acceso`, `escolarEstado`, `escolarManejo`, `dictamen`, `visitas`, `ayudasRecibidas`, `estados`; más:
`gruposIntegrantes` (`{ campo, etiqueta }` → cada `campo` es un contador de `/composicion`), `categoriasDano` (`{ campo, etiqueta }` → cada `campo` es un daño de `/vivienda`), `escalaDano` (0–4) y `gruposNecesidad` (`[{ codigo, etiqueta, items: [{ codigo, etiqueta }] }]`). Los códigos son estables; solo cambian etiquetas y orden.

### `POST /hogares` → `201`
```json
{
  "autorizaTratamiento": true,
  "autorizaSeguimiento": false,
  "versionConsentimiento": "v1",
  "sector": "Zona alta",
  "direccion": "Cra 80 # 50-10", "interior": "2", "callejon": "El Pino",
  "nombreReferencia": "María Gómez", "telefonoContacto": "3001234567",
  "observaciones": "texto libre"
}
```
* **Si NO autoriza**: envía solo `autorizaTratamiento: false`, `versionConsentimiento` (y opcionalmente `sector`). Responde `estado: "sin_autorizacion"` y **el asistente termina**. Si envías datos personales, responde `400`.
* `autorizaSeguimiento` solo puede ser `true` si autoriza el tratamiento.
* `fechaAplicacion` (opcional, `YYYY-MM-DD`, no futura). Teléfono: 7–30 caracteres entre dígitos, `+ ( ) -` y espacios.
* Una misma dirección (+ interior) no se registra dos veces: responde `409` *"Ya existe un hogar registrado con esa dirección; consulta con coordinación"*.

### `PUT /hogares/:ref/composicion`
```json
{
  "respEsJefe": false, "respParentesco": "Hija", "respGenero": "femenino", "respEdad": 34,
  "numPersonas": 5, "ninosEdades": [4, 9],
  "adultosMayores": 1, "conDiscapacidad": 0, "embarazoLactancia": 0,
  "cuidadosEspeciales": 0, "cuidadores": 1, "sostenimiento": 2,
  "escolarEstado": "dejaron_de_asistir", "escolarDias": 6,
  "escolarManejo": "con_dificultades", "escolarManejoOtro": null
}
```
`respParentesco` solo si `respEsJefe = false`. La escolaridad solo si hay niños; `escolarDias` solo si `dejaron_de_asistir`; `escolarManejoOtro` solo si `escolarManejo = otro`. `numPersonas` va primero: ni niños + adultos mayores ni ningún grupo pueden superarlo.

### `PUT /hogares/:ref/vivienda`
```json
{
  "materialParedes": "concreto_ladrillo", "nivelAgua": "rodilla", "inundadaAntes": "si",
  "medioAlerta": "vecinos", "medioAlertaOtro": null,
  "pernocta": "albergue",
  "ingresos": "reducida_temporal", "ingresosOtro": null,
  "electricaDanada": false, "lodo": "poco", "acceso": "con_escombros", "viviendaVista": true,
  "danoEstructura": 2, "danoTechoPuertasVentanas": 1, "danoInstalaciones": 3, "danoMueblesElectrodomesticos": 4,
  "danoRopaEnseres": 0, "danoHerramientasTrabajo": 0, "danoDocumentos": 1, "danoAnimales": 0
}
```
Daños: `0` sin daño · `1` leve · `2` moderado · `3` severo · `4` pérdida total. Los `*Otro` solo cuando se eligió "otro".

### `PUT /hogares/:ref/necesidades`
```json
{
  "items": ["agua_beber", "medicamentos_atencion_medica", "otro_condicion_especial", "alimentos"],
  "urgentes": ["agua_beber", "medicamentos_atencion_medica"],
  "detalleOtro": "Pañales para adulto mayor",
  "apoyoEmocional": true,
  "numMascotas": 1
}
```
`urgentes`: hasta 3, solo entre los marcados, el orden es la prioridad 1-2-3. `detalleOtro` es obligatorio si marcó `otro_condicion_especial`, y no aplica si no.

### `PUT /hogares/:ref/atencion`
```json
{
  "visitas": ["jac", "otro"], "visitasOtro": "Parroquia",
  "censoPrevio": "si", "censoQuien": "Alcaldía",
  "dictamen": "evacuacion_temporal", "inscritaRud": "no_sabe",
  "ofertaRecibida": true, "ofertaAceptada": false,
  "ayudasRecibidas": ["kit_aseo", "agua"], "ayudasOtra": null
}
```
`visitas: ["nadie"]` va solo; `ayudasRecibidas: ["ninguna"]` va sola (y `[]` significa "no se preguntó"). `censoQuien` solo si `censoPrevio = si`; `ofertaAceptada` solo si `ofertaRecibida = true`.

### `PUT /hogares/:ref/contacto`
`{ "direccion", "nombreReferencia", "interior"?, "callejon"?, "telefonoContacto"?, "observaciones"? }`. Solo para corregir errores de digitación: la API escribe estos datos pero no puede leerlos.

### `POST /hogares/:ref/completar` → `200`
Devuelve el avance con `estado: "completo"`. Si falta algo: `400` con la lista en `message`.

## 5. Reglas del front

1. **Solo selectores** para todo lo que tiene código. Texto libre únicamente en nombre, teléfono, dirección, interior, callejón, observaciones y los "Otro: ____".
2. **Campos condicionales: se muestran u ocultan, no se dejan "opcionales"** (parentesco, escolaridad, `*Otro`, `censoQuien`, `ofertaAceptada`). Al ocultar un campo, no lo envíes.
3. **Daños sin opción preseleccionada**: "sin daño" (0) es una respuesta, "no se preguntó" no. Muestra el total en vivo.
4. **Prioridades**: los desplegables 1–3 ofrecen solo los ítems ya marcados, sin repetir.
5. **Conteos**: `numPersonas` primero; los demás contadores no pueden pasarlo. Edades de niños 0–17.
6. **"Nadie"** desmarca y bloquea las otras visitas; **"Ninguna"** igual con las ayudas.
7. **Pantalla de cierre**: muestra `faltantes`, `resumen` y las 4 `alertas`; el botón "Completar" se habilita con `puedeCompletar`.
8. **No guardes datos personales de forma persistente en el dispositivo**: el borrador local se borra al completar la ficha (`estado: "completo"`) y al cerrar sesión. Dispositivos compartidos entre voluntarios son lo normal en campo.
9. **Nunca registres** (consola, analítica, reportes de errores) los cuerpos de las peticiones: llevan datos personales.

## 6. Dónde se consulta la información (base de datos, no API)

Para decidir y repartir recursos, coordinación usa el rol `rol_coordinacion` (o el panel de Supabase). Vistas:

| Vista | Para qué |
|---|---|
| `v_cola_entrega` | Hogares completos listos para visitar: dirección, contacto, alertas, `n_alertas`, lo urgente, y qué ayudas ya se les entregaron. Orden sugerido: `ORDER BY n_alertas DESC, total_dano DESC, num_personas DESC`. El teléfono solo aparece si la familia autorizó el seguimiento. |
| `v_demanda_ayuda` | Qué se necesita y dónde (por sector e ítem: hogares, hogares donde es urgente, personas). Sin nombres. Sirve para compras y logística. |
| `v_totales_sector` | Totales anónimos para compartir hacia afuera. Sectores con menos de 5 hogares se agrupan en "Otros sectores". |
| `v_hogar_completo` | Todo el formulario en una fila (con datos personales): consultas ad hoc. |
| `v_alertas_hogar` | Las 4 alertas de seguimiento urgente, definidas en un solo lugar. |

Las entregas reales se registran en `entrega_ayuda` (estados `en_revision` → `verificada` / `rechazada`); `v_cola_entrega` solo cuenta las `verificada`. Quién cambió qué y cuándo queda en `bitacora` (sin copiar valores). Si una familia retira su consentimiento: `SELECT revocar_consentimiento(<id_hogar>)` borra sus datos y deja el hogar como `sin_autorizacion`.

## 7. Seguridad (resumen)

* **Sin lectura de datos sensibles desde el front**: ningún endpoint los devuelve, y además el rol de base de datos de la API (`rol_formulario`) **no tiene permiso de lectura** sobre `hogar_contacto` (nombre, dirección, teléfono, observaciones). Aunque la API tuviera un fallo, no podría filtrarlos.
* **Datos personales aislados** en una sola tabla; el resto de la ficha no identifica a nadie por sí sola.
* **Identificadores no adivinables** (`ref` uuid) en las rutas.
* **Login por voluntario** (Supabase Auth): token individual y revocable, verificado por la API contra Supabase; solo entra quien fue invitado y aceptó la invitación (el registro público está desactivado). Cada voluntario solo accede a sus hogares y la bitácora registra su correo. **Tope de peticiones por IP** y bloqueo temporal tras 20 sesiones inválidas.
* **CORS cerrado** a los orígenes de `CORS_ORIGIN`; cabeceras seguras y `Cache-Control: no-store`; cuerpo máximo 100 KB.
* **Reglas de integridad en la base** (CHECK + `hogar_faltantes`): nadie puede dejar una ficha incoherente saltándose la API.
* **Sin datos personales en logs**: los errores de la base se registran sin parámetros.
* **RLS** activo en todas las tablas y cero acceso para `anon`/`authenticated` de Supabase; **bitácora** de cambios; **revocación del consentimiento**.
* **Sin secretos en el front**: el front solo lleva la URL y la `anon key` de Supabase, públicas por diseño. Si se roba una sesión, se revoca ese usuario (efecto en máximo 60 s) sin tocar a los demás.

## 8. Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| `400` | Forma inválida, regla de coherencia o falta algo para completar | `{ "message": "texto" }` o `{ "message": ["…", "…"] }` |
| `401` | Sin sesión, token vencido, inválido o correo sin confirmar → pedir login de nuevo | `{ "message": "Sesión inválida o vencida: inicia sesión de nuevo" }` |
| `404` | El hogar no existe o no es tuyo | `{ "message": "No existe el hogar" }` |
| `409` | Hogar ya no editable, o dirección repetida | `{ "message": "El hogar está 'completo' y ya no se puede modificar" }` |
| `429` | Demasiadas peticiones / sesiones inválidas |
| `503` | No se pudo verificar la sesión con Supabase; reintenta | `{ "message": "…" }` |
| `500` | Error inesperado (no revela detalles) | `{ "message": "No fue posible guardar la información" }` |

`message` puede ser texto o arreglo de textos: muéstralo siempre como lista.
