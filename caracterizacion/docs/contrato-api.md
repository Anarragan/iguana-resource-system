# Contrato de la API – Caracterización La Iguaná

Una **ficha por hogar**, respondida por **una persona**, en un asistente de pasos. Todo se envía en JSON; los nombres van en `camelCase`. Las opciones **nunca se escriben a mano en el front**: salen de `GET /catalogos` (listas que crecen) o de los valores cerrados de abajo.

## 1. Qué NO se le pide a quien aplica (reduce errores)

| Dato del formulario | Qué hace el sistema |
|---|---|
| Código del hogar `IG-____` | Lo asigna el servidor (`IG-0001`…). |
| Barrio "La Iguaná" | Fijo en el servidor. |
| Nº de niños | Es la cantidad de edades que se registran (`menores.length`). |
| Total de daño del hogar | Se calcula (`resumen.totalDano`). |
| Las 4 alertas de "Seguimiento urgente" | Se calculan de lo ya respondido (`seguimiento`). No son casillas. |
| Fecha de aplicación | Hoy por defecto, editable (no admite fecha futura). |
| Versión del texto de consentimiento | Constante del front (ej. `"v1"`), no se pregunta. |
| Persona que aplica | Se pide una vez por dispositivo y se recuerda. |
| Respuestas sin información útil (género, RUD, censo…) | Si no se envían, la base pone un valor por defecto (ver §5). |

## 2. Flujo mínimo

```
GET  /catalogos                      → arma el formulario
POST /fichas                         → Momento cero + Mód.1 P2-P4 y vivienda  → { idFicha }
PUT  /fichas/:id/respondente         → Mód.1 P5-P7
PUT  /fichas/:id/grupos              → Mód.1 P8-P11
PUT  /fichas/:id/escolaridad         → Mód.1 P12-P14  (solo si hay menores)
PUT  /fichas/:id/situacion           → Mód.2 P4,P5,P7-P10 + Mód.3 P8-P9 + Cierre P1
PUT  /fichas/:id/danos               → Mód.2 P6
PUT  /fichas/:id/necesidades         → Mód.3 P1-P7 y P10
PUT  /fichas/:id/visitantes          → Mód.4 P1
PUT  /fichas/:id/atencion            → Mód.4 P2-P6
POST /fichas/:id/completar           → valida y cierra
GET  /fichas/:id                     → todo anidado (+ resumen y seguimiento)
GET  /fichas?limite=&desde=          → listado
```

Cada PUT **reemplaza completo** su paso, así que se puede volver atrás y reenviar. Mientras la ficha esté en `borrador` se puede editar; después responde `409`.

**Obligatorio para poder completar:** `numPersonas` (en `grupos`), respondente, `situacion.lugarPernocta` y las 8 categorías de `danos`. Todo lo demás es opcional.

## 3. Endpoints

### `GET /catalogos`
```json
{
  "gruposIntegrantes": [{ "codigo": "adulto_mayor", "etiqueta": "Personas adultas mayores (60+)", "orden": 1 }],
  "categoriasDano":    [{ "codigo": "estructura", "etiqueta": "...", "orden": 1 }],
  "gruposNecesidad":   [{ "codigo": "alimentacion", "etiqueta": "Alimentación", "orden": 1 }],
  "itemsNecesidad":    [{ "codigo": "alimentos", "grupo": "alimentacion", "etiqueta": "Alimentos", "orden": 1 }],
  "actores":           [{ "codigo": "jac", "etiqueta": "Junta de Acción Comunal" }],
  "tiposAyuda":        [{ "codigo": "kit_aseo", "etiqueta": "Kit de aseo" }]
}
```
Los códigos son estables; solo cambian las etiquetas y el orden. Agrupa `itemsNecesidad` por `grupo`.

### `POST /fichas` → `201`
```json
{
  "voluntario": "Ana Pérez",
  "fechaAplicacion": "2025-10-12",
  "autorizaTratamiento": true,
  "autorizaSeguimiento": false,
  "versionConsentimiento": "v1",
  "vivienda": {
    "direccion": "Cra 80 # 50-10", "interior": "2", "callejon": "El Pino",
    "materialParedes": "concreto_ladrillo", "nivelAguaMax": "rodilla", "inundadaAntes": "si"
  },
  "hogar": { "nombreReferencia": "María Gómez", "telefonoContacto": "3001234567" },
  "observaciones": "texto libre"
}
```
Respuesta: `{ "idFicha": 12, "idHogar": 7, "estado": "borrador" }`

- **Si NO autoriza** (`autorizaTratamiento: false`): envía solo `voluntario`, `fechaAplicacion`, `autorizaTratamiento`, `versionConsentimiento`. Responde `estado: "sin_autorizacion"` y **el asistente termina** (no hay más pasos).
- Con autorización se exige `vivienda` + `hogar`, o bien `idHogar` para re-aplicar a un hogar ya registrado.
- Teléfono: 7–30 caracteres entre dígitos, `+ ( ) -` y espacios.

### `PUT /fichas/:id/respondente`
```json
{ "esJefe": false, "parentesco": "Hija", "genero": "femenino", "edad": 34 }
```
`parentesco` solo si `esJefe = false` (si `esJefe = true` no lo envíes: la base lo rechaza). `genero` opcional.

### `PUT /fichas/:id/grupos`
```json
{
  "numPersonas": 5,
  "menores": [4, 9],
  "grupos": [
    { "grupo": "adulto_mayor", "cantidad": 1 },
    { "grupo": "cuida_hogar", "cantidad": 1 },
    { "grupo": "sostiene_hogar", "cantidad": 2 }
  ]
}
```
`menores` = la edad (0–17) de cada niño/a; `[]` si no hay. `grupos`: solo los que tengan cantidad > 0; los códigos salen de `gruposIntegrantes`.

### `PUT /fichas/:id/escolaridad` (mostrar solo si `menores.length > 0`)
```json
{ "dejaronDeAsistir": true, "diasSinAsistir": 6, "manejoEstudios": "con_dificultades", "manejoOtro": null }
```
`diasSinAsistir` solo si `dejaronDeAsistir = true`.

### `PUT /fichas/:id/situacion`
```json
{
  "medioAlerta": "vecinos", "medioAlertaOtro": null,
  "lugarPernocta": "albergue",
  "ingresos": "reducida_temporal", "ingresosOtro": null,
  "electricaDanada": false, "lodo": "poco", "acceso": "con_escombros",
  "viviendaVista": true, "apoyoEmocional": true, "numMascotas": 1
}
```
`lugarPernocta` es **obligatorio**. `numMascotas`: 0 si responde "No" (por defecto 0).

### `PUT /fichas/:id/danos` (siempre las 8, una vez cada una)
```json
{ "danos": [ { "categoria": "estructura", "nivel": 2 }, { "categoria": "documentos", "nivel": 0 } ] }
```
Escala: `0` sin daño · `1` leve · `2` moderado · `3` severo · `4` pérdida total.

### `PUT /fichas/:id/necesidades` (solo lo marcado; `[]` si nada)
```json
{ "necesidades": [
  { "item": "agua_beber", "prioridad": 1 },
  { "item": "medicamentos_atencion_medica", "prioridad": 2 },
  { "item": "otro_condicion_especial", "detalle": "Pañales para adulto mayor" },
  { "item": "alimentos" }
] }
```
`prioridad` 1–3 ("lo más urgente"), sin repetir. `detalle` es **obligatorio** solo para `otro_condicion_especial`.

### `PUT /fichas/:id/visitantes`
```json
{ "visitantes": [ { "actor": "jac" }, { "actor": "otro", "detalle": "Parroquia" } ] }
```
Si eligen `nadie`, es el único elemento.

### `PUT /fichas/:id/atencion`
```json
{
  "censoPrevio": "si", "censoQuien": "Alcaldía",
  "dictamen": "evacuacion_temporal",
  "inscritaRud": "no_sabe",
  "ofertaRecibida": true, "ofertaAceptada": false,
  "ayudasRecibidas": ["kit_aseo", "agua"]
}
```
`ayudasRecibidas` = códigos de `tiposAyuda`; `[]` equivale a "Ninguna". `ofertaAceptada` solo si `ofertaRecibida = true`.

### `POST /fichas/:id/completar` → `200`
`{ "idFicha": 12, "estado": "completa" }`. Si falta algo, `400` con la lista de problemas en `message`.

### `GET /fichas/:id`
Devuelve la ficha con `hogar` (+ `vivienda`), `respondente`, `escolaridad`, `situacion`, `atencion`, `menores` (lista de edades), `grupos`, `danos`, `necesidades`, `visitantes`, `ayudasRecibidas`, y:
- `resumen`: `{ numPersonas, ninos, adultosMayores, totalDano }`
- `seguimiento`: `{ duermeEnRiesgo, urgenteSalud, urgenteAguaAlimento, electricaRiesgo, requiereSeguimiento }` — **`null` hasta que la ficha esté completa**.

## 4. Valores cerrados (no vienen de `/catalogos`)

| Campo | Valores |
|---|---|
| `materialParedes` | `concreto_ladrillo` `madera_tablaroca` `bahareque_adobe` `zinc_carton_madera_no_tratada` `reciclado_desecho` |
| `nivelAguaMax` | `no_entro` `tobillo` `rodilla` `cintura` `pecho` `techo` |
| `inundadaAntes`, `censoPrevio`, `inscritaRud` | `si` `no` `no_sabe` |
| `genero` | `femenino` `masculino` `no_binario_otro` `prefiere_no_responder` |
| `manejoEstudios` | `normalidad` `con_dificultades` `no_estudia` `otro` |
| `medioAlerta` | `alerta_oficial` `vecinos` `sirena` `no_se_entero` `otro` |
| `lugarPernocta` | `misma_vivienda` `familiares_amistades` `albergue` `arrendado_temporal` `intemperie_improvisado` `sin_lugar` |
| `ingresos` | `interrumpida_total` `reducida_temporal` `no_afectada` `otro` |
| `lodo` | `nada` `poco` `mucho` |
| `acceso` | `despejado` `con_escombros` `bloqueado` |
| `dictamen` | `puede_habitarse` `evacuacion_temporal` `evacuacion_definitiva` `nadie_ha_ido` |

## 5. Reglas del front para evitar errores humanos

1. **Solo selectores, nunca texto libre** para lo que tiene código. Texto libre únicamente en: nombre, teléfono, dirección, interior, callejón, observaciones y los campos "Otro: ____".
2. **Campos condicionales: se muestran u ocultan, no se dejan "opcionales"**:
   - `parentesco` solo si "¿es jefe?" = No.
   - Escolaridad completa solo si hay menores; `diasSinAsistir` solo si "dejaron de asistir".
   - `*Otro` / `detalle` solo cuando se elige "Otro" (y entonces es obligatorio).
   - `censoQuien` solo si `censoPrevio = si`; `ofertaAceptada` solo si `ofertaRecibida = true`.
   - Al ocultar un campo, **no lo envíes** (o envía `null`).
3. **Daños: sin opción preseleccionada.** "Sin daño" (0) es una respuesta, "no se preguntó" no lo es. No avanza hasta que las 8 tengan valor. Muestra el total en vivo (suma).
4. **Prioridades (Mód.3 P10):** los desplegables 1–3 ofrecen únicamente los ítems ya marcados y no permiten repetir.
5. **Conteos:** `numPersonas` va primero; los demás contadores (grupos y niños) no deben pasar de ese número; se valida en pantalla y de nuevo al completar. Edades de niños 0–17.
6. **"Nadie"** en visitantes desmarca y bloquea las demás opciones; "Ninguna" en ayudas se envía como `[]`.
7. **Pantalla de cierre:** muestra las 4 alertas calculadas con lo respondido (solo lectura, resaltadas si alguna aplica) y un resumen antes de `completar`.
8. **Guardar paso a paso**: un `PUT` al pulsar "Siguiente" en cada pantalla, para no perder trabajo si se cae la conexión; el estado queda en `borrador` y se retoma con `GET /fichas/:id`.
9. **Valores por defecto de la base** (si no se envían): `inundadaAntes = no_sabe`, `genero = prefiere_no_responder`, `censoPrevio = inscritaRud = no_sabe`, `dictamen = nadie_ha_ido`, `ofertaRecibida = false`, `electricaDanada = viviendaVista = apoyoEmocional = false`, `numMascotas = 0`. Si la pregunta es importante para el equipo (p. ej. instalación eléctrica), **hazla obligatoria en la pantalla** en vez de depender del default.

## 6. Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| `400` | Validación del cuerpo o regla de coherencia | `{ "message": ["campo ..."] }` o `{ "message": "texto" }` |
| `404` | La ficha o el hogar no existe | `{ "message": "No existe la ficha 12" }` |
| `409` | La ficha ya no está en borrador | `{ "message": "La ficha está 'completa' y no se puede modificar" }` |
| `500` | Error inesperado del servidor | `{ "message": "No fue posible guardar la ficha" }` |

`message` puede ser texto o arreglo de textos: muéstralo siempre como lista.
