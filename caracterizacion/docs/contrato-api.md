# Contrato de la API de caracterización

Servicio para registrar las familias del sector La Iguaná (Medellín) afectadas por la inundación, y sus integrantes. Cada envío es **una caracterización completa**: un hogar, una familia, sus personas, sus afectaciones y sus necesidades. Se guarda todo o nada.

- Base URL: `http://<host>:<PORT>` (por defecto `PORT=3000`). El front debe estar en `CORS_ORIGIN` (varios, separados por coma).
- Formato: JSON, `Content-Type: application/json`, UTF-8.
- No se aceptan campos que no estén en este contrato (responden 400).
- Los textos se envían con o sin espacios en los extremos; el back los recorta.

## Flujo del formulario ↔ contrato

| Paso del front | Bloque del JSON |
|---|---|
| 1. Hogar | `hogar` |
| 2. Familia | `familia` |
| 3. Personas | `personas[]` (mínimo 1) |
| 4. Afectaciones | `afectaciones[]` (puede ir vacío) |
| 5. Necesidades | `necesidades[]` (puede ir vacío) |
| Finalizar | un único `POST /caracterizacion` |

El front puede guardar los pasos en memoria y enviar todo al pulsar **Finalizar**.

## 1. `GET /caracterizacion/catalogos`

Devuelve las listas de los desplegables de afectaciones y necesidades. El front debe usar `valor` al enviar y `etiqueta` para mostrar.

```json
{
  "categoriasAfectacion": [{ "valor": "vivienda", "etiqueta": "Vivienda" }],
  "nivelesAfectacion":    [{ "valor": "perdida_total", "etiqueta": "Pérdida total" }],
  "categoriasNecesidad":  [{ "valor": "alojamiento", "etiqueta": "Alojamiento" }],
  "nivelesUrgencia":      [{ "valor": "alta", "etiqueta": "Alta" }]
}
```


## 2. `POST /caracterizacion`

### Entrada

```json
{
  "hogar": {
    "direccionReferencia": "Calle 10, barrio La Iguaná",
    "observaciones": "Vivienda afectada por inundación"
  },
  "familia": {
    "nombreReferencia": "María Pérez",
    "telefonoContacto": "3001234567"
  },
  "personas": [
    {
      "nombres": "María Pérez",
      "fechaNacimiento": "1985-03-21",
      "requiereApoyo": false,
      "observaciones": "Opcional"
    }
  ],
  "afectaciones": [
    { "categoria": "enseres", "descripcion": "Pérdida de electrodomésticos", "nivelAfectacion": "grave" }
  ],
  "necesidades": [
    { "categoria": "alojamiento", "descripcion": "Refugio temporal", "nivelUrgencia": "alta" }
  ]
}
```

### Campos

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `hogar.direccionReferencia` | string | sí | máx. 200 |
| `hogar.observaciones` | string | no | máx. 500 |
| `familia.nombreReferencia` | string | sí | máx. 150 |
| `familia.telefonoContacto` | string | no | máx. 30 |
| `personas` | array | sí | mínimo 1 elemento |
| `personas[].nombres` | string | sí | máx. 150, no vacío |
| `personas[].fechaNacimiento` | string `AAAA-MM-DD` | no | fecha real y no futura (el front convierte desde dd/mm/aaaa) |
| `personas[].requiereApoyo` | boolean | **sí** | `true` / `false` (radio Sí/No) |
| `personas[].observaciones` | string | no | máx. 500 |
| `afectaciones` | array | sí | puede ser `[]` |
| `afectaciones[].categoria` | string | sí | `vivienda` `enseres` `alimentos` `ropa` `comercio` `ingresos` `otro` |
| `afectaciones[].descripcion` | string | sí | máx. 1000 |
| `afectaciones[].nivelAfectacion` | string | sí | `leve` `moderado` `grave` `perdida_total` |
| `necesidades` | array | sí | puede ser `[]` |
| `necesidades[].categoria` | string | sí | `alimentacion` `alojamiento` `aseo` `ropa` `enseres` `salud` `recuperacion_economica` `otro` |
| `necesidades[].descripcion` | string | sí | máx. 1000 |
| `necesidades[].nivelUrgencia` | string | sí | `baja` `media` `alta` |

Campos que el back asigna y el front **no** envía (si los envía, responde 400): **código de hogar y de familia**, ids, sector, fechas de registro y caracterización, y estados de verificación (`pendiente`, `declarada`, etc.).

Los códigos tienen el formato `HOG-0001` y `FAM-0001`, son únicos y los genera el back. El front los recibe en la respuesta y solo debe mostrarlos (pantalla de resumen o comprobante para la familia).

### Salida: `201 Created`

Alimenta la pantalla "Caracterización registrada" (resumen).

```json
{
  "mensaje": "Caracterización registrada correctamente",
  "hogar":   { "id": 4, "codigo": "HOG-0004" },
  "familia": { "id": 3, "codigo": "FAM-0003" },
  "resumen": { "personas": 1, "afectaciones": 1, "necesidades": 1 },
  "idsPersonas": [2],
  "idsAfectaciones": [1],
  "idsNecesidades": [1]
}
```

### Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | El JSON no cumple el contrato | `{ "statusCode": 400, "error": "Bad Request", "message": ["personas.0.nombres should not be empty", "..."] }` |
| 500 | Falla interna; no se guardó nada | `{ "statusCode": 500, "message": "No fue posible registrar la caracterización" }` |

En 400, `message` es una lista de textos que empiezan por la ruta del campo (`hogar.direccionReferencia`, `personas.0.nombres`); sirve para marcar el campo en el formulario. Los textos de `class-validator` están en inglés, así que el front debería mostrar su propio mensaje según la ruta.

En 500 no se guardó nada, así que el front puede reintentar con el mismo formulario sin riesgo de duplicar.

## 3. `GET /caracterizacion`

Lista las familias registradas, de la más reciente a la más antigua. Parámetros opcionales de query:

| Parámetro | Tipo | Por defecto | Reglas |
|---|---|---|---|
| `limite` | entero | 100 | de 1 a 500 |
| `desde` | entero | 0 | mínimo 0; cuántas familias saltar para paginar |

### Salida: `200 OK`

Un arreglo (vacío `[]` si no hay familias):

```json
[
  {
    "familia": {
      "id": 5,
      "codigo": "FAM-0005",
      "nombreReferencia": "María Pérez",
      "telefonoContacto": "3001234567",
      "fechaCaracterizacion": "2026-10-15T23:58:09.594Z",
      "estadoVerificacion": "pendiente"
    },
    "hogar": {
      "id": 5,
      "codigo": "HOG-0005",
      "direccionReferencia": "Calle 10 #45-12, barrio La Iguaná",
      "sector": "La Iguaná",
      "observaciones": null
    },
    "resumen": { "personas": 2, "afectaciones": 1, "necesidades": 1 }
  }
]
```

`telefonoContacto` y `observaciones` son `null` cuando no se registraron. Un `limite` o `desde` inválido responde 400.

## 4. `GET /caracterizacion/:id`

Detalle completo de una caracterización. **`:id` es el id de la familia** (`familia.id` de la lista o de la respuesta del POST).

### Salida: `200 OK`

```json
{
  "hogar": {
    "id": 5, "codigo": "HOG-0005",
    "direccionReferencia": "Calle 10 #45-12, barrio La Iguaná",
    "sector": "La Iguaná", "observaciones": null,
    "fechaRegistro": "2026-10-15T23:58:09.594Z"
  },
  "familia": {
    "id": 5, "codigo": "FAM-0005", "nombreReferencia": "María Pérez",
    "telefonoContacto": "3001234567",
    "fechaCaracterizacion": "2026-10-15T23:58:09.594Z",
    "estadoVerificacion": "pendiente"
  },
  "personas": [
    { "id": 8, "nombres": "María Pérez", "fechaNacimiento": "1985-03-21", "requiereApoyo": true, "observaciones": null }
  ],
  "afectaciones": [
    { "id": 6, "categoria": "vivienda", "descripcion": "Techo caído", "nivelAfectacion": "grave",
      "fechaReporte": "2026-10-15T23:58:09.594Z", "estadoVerificacion": "declarada" }
  ],
  "necesidades": [
    { "id": 6, "categoria": "alojamiento", "descripcion": "Refugio temporal", "nivelUrgencia": "alta",
      "estado": "pendiente", "fechaRegistro": "2026-10-15T23:58:09.594Z" }
  ]
}
```

- `personas`, `afectaciones` y `necesidades` son `[]` si no hay.
- `fechaNacimiento` es `AAAA-MM-DD` o `null`; las demás fechas son ISO 8601 en UTC.
- Estados posibles: familia `pendiente` | `verificada` | `requiere_revision`; afectación `declarada` | `verificada` | `requiere_revision`; necesidad `pendiente` | `atendida_parcialmente` | `cubierta`.

| Código | Cuándo |
|---|---|
| 404 | No existe una familia con ese id: `{ "statusCode": 404, "error": "Not Found", "message": "No existe una familia con id 999999" }` |
| 400 | `:id` no es un número |

## Reglas de negocio

- El sector es siempre **La Iguaná**: el front no lo envía (si lo envía, responde 400) y el back lo asigna.
- Los códigos de hogar y familia los genera el sistema (`HOG-0001`, `FAM-0001`) a partir del id de la base, dentro de la misma transacción del registro. Nunca se repiten ni los digita el voluntario.
- Una familia pertenece a un hogar. Cada envío crea un hogar nuevo con su familia: este contrato no agrega personas a una familia ya registrada.
- Los datos de verificación (estados) los gestiona el back; toda familia nace `pendiente` y toda afectación `declarada`.
