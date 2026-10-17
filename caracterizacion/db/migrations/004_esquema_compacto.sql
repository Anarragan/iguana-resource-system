-- =====================================================================
-- Caracterización La Iguaná – esquema compacto v3 (PostgreSQL / Supabase)
-- ~300 hogares, ~1000 personas, UNA ficha por hogar.
--
-- REEMPLAZA el esquema de 002/003 y BORRA sus datos (arranque en cero). Respalda antes si hay algo que conservar.
-- Ejecutar con el usuario dueño de las tablas. Todo ocurre en una transacción: si algo falla no se cambia nada.
--
--   TABLAS
--   hogar            identidad, consentimiento, estado           (SIN datos personales)
--   hogar_contacto   dirección, nombre, teléfono, observaciones   (TODO lo identificable, aislado)
--   composicion      Módulo 1: quién responde y cuántas personas
--   vivienda_danos   Módulo 2: estado de la vivienda y daños 0-4
--   necesidades      Módulo 3: qué necesitan y qué es lo más urgente
--   atencion         Módulo 4: quién ha pasado y qué dicen haber recibido
--   entrega_ayuda    ayudas REALES que entrega el equipo (muchas por hogar)
--   bitacora         quién cambió qué y cuándo (sin copiar valores)
--
--   VISTAS
--   v_alertas_hogar   las 4 alertas de seguimiento urgente, definidas una vez (sin datos personales)
--   v_hogar_completo  todo en una fila por hogar              → coordinación (incluye datos personales)
--   v_cola_entrega    hogares completos con alertas y ayudas  → coordinación (reparto de recursos)
--   v_demanda_ayuda   qué se necesita y dónde, sin nombres    → logística
--   v_totales_sector  totales anónimos (sectores < 5 hogares agrupados) → lo único que sale al exterior
--   v_progreso_hogar  pasos hechos + alertas, sin datos personales → la usa la API de voluntarios
--
--   SEGURIDAD (ver sección final)
--   · RLS activo en todo y cero acceso para anon/authenticated de Supabase.
--   · rol_formulario (la API): escribe, pero NO puede leer hogar_contacto ni las vistas completas.
--   · rol_coordinacion: lee las vistas y registra entregas.
--   · Las reglas "¿está completo?" viven en la base (hogar_faltantes) y nadie puede saltárselas.
--   · bitacora automática; el consentimiento se puede revocar con revocar_consentimiento().
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 0. Limpieza: BORRA el esquema anterior y cualquier tabla de esta versión (deja la base en cero)
-- ---------------------------------------------------------------------
DROP VIEW  IF EXISTS v_progreso_hogar, v_totales_sector, v_demanda_ayuda, v_cola_entrega, v_hogar_completo,
                     v_alertas_hogar, v_seguimiento_urgente, v_ficha_resumen;
DROP TABLE IF EXISTS bitacora, entrega_ayuda, atencion, necesidades, vivienda_danos, composicion, hogar_contacto,
                     ficha_visitante, necesidad, dano, ficha_grupo, ficha_menor, ficha_atencion, ficha_situacion,
                     ficha_escolaridad, ficha_respondente, ficha, hogar, vivienda, voluntario,
                     tipo_ayuda, actor, item_necesidad, grupo_necesidad, categoria_dano, grupo_integrantes CASCADE;
DROP SCHEMA IF EXISTS legacy CASCADE;

CREATE OR REPLACE FUNCTION es_unico(a text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT a IS NULL OR cardinality(a) = (SELECT count(DISTINCT x) FROM unnest(a) x) $$;

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------
CREATE TABLE hogar (
  id_hogar        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref             uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,      -- identificador de la API (no adivinable)
  codigo_hogar    varchar(20) GENERATED ALWAYS AS ('IG-' || lpad(id_hogar::text, 4, '0')) STORED UNIQUE, -- para leer/decir en voz alta
  sector          varchar(100),                                        -- subzona dentro de La Iguaná
  autoriza_tratamiento boolean NOT NULL,
  autoriza_seguimiento boolean NOT NULL DEFAULT false,
  version_consentimiento varchar(20) NOT NULL,
  fecha_aplicacion date NOT NULL DEFAULT current_date,
  aplicada_por    varchar(150) NOT NULL,
  estado          varchar(20) NOT NULL DEFAULT 'borrador',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hogar_estado_chk      CHECK (estado IN ('borrador','completo','sin_autorizacion')),
  CONSTRAINT hogar_consent_chk     CHECK ((NOT autoriza_tratamiento) = (estado = 'sin_autorizacion')),
  CONSTRAINT hogar_seguimiento_chk CHECK (autoriza_tratamiento OR NOT autoriza_seguimiento),
  CONSTRAINT hogar_fecha_chk       CHECK (fecha_aplicacion <= current_date)
);

-- Todo lo que identifica a la familia (y el texto libre, que puede traer nombres) vive aquí y solo aquí.
-- Existe únicamente si la familia autorizó el tratamiento de datos.
CREATE TABLE hogar_contacto (
  id_hogar        bigint PRIMARY KEY REFERENCES hogar ON DELETE CASCADE,
  direccion       text NOT NULL,
  interior        varchar(50),
  callejon        varchar(100),
  nombre_referencia varchar(150) NOT NULL,
  telefono_contacto varchar(30),
  observaciones   text
);

CREATE TABLE composicion (
  id_hogar        bigint PRIMARY KEY REFERENCES hogar ON DELETE CASCADE,
  -- quien responde
  resp_es_jefe    boolean,
  resp_parentesco varchar(60),
  resp_genero     varchar(25),
  resp_edad       smallint,
  -- personas al momento de la inundación
  num_personas    smallint,
  ninos_edades    smallint[] NOT NULL DEFAULT '{}',
  num_ninos       smallint GENERATED ALWAYS AS (cardinality(ninos_edades)) STORED,
  adultos_mayores smallint,
  con_discapacidad smallint,
  embarazo_lactancia smallint,
  cuidados_especiales smallint,
  cuidadores      smallint,
  sostenimiento   smallint,
  -- escolaridad (solo si hay niños)
  escolar_estado  varchar(20),
  escolar_dias    smallint,
  escolar_manejo  varchar(20),
  escolar_manejo_otro varchar(150),
  CONSTRAINT composicion_genero_chk   CHECK (resp_genero IN ('femenino','masculino','no_binario_otro','prefiere_no_responder')),
  CONSTRAINT composicion_edad_chk     CHECK (resp_edad BETWEEN 0 AND 120),
  CONSTRAINT composicion_personas_chk CHECK (num_personas BETWEEN 1 AND 60),
  CONSTRAINT composicion_grupos_chk   CHECK (adultos_mayores >= 0 AND con_discapacidad >= 0 AND embarazo_lactancia >= 0
                                             AND cuidados_especiales >= 0 AND cuidadores >= 0 AND sostenimiento >= 0),
  CONSTRAINT composicion_parentesco_chk CHECK (resp_parentesco IS NULL OR resp_es_jefe IS FALSE),
  CONSTRAINT composicion_edades_chk   CHECK (0 <= ALL (ninos_edades) AND 17 >= ALL (ninos_edades)),
  CONSTRAINT composicion_conteo_chk   CHECK (num_ninos + COALESCE(adultos_mayores,0) <= COALESCE(num_personas, 32767)),
  CONSTRAINT composicion_grupos_max_chk CHECK (GREATEST(con_discapacidad, embarazo_lactancia, cuidados_especiales, cuidadores, sostenimiento, 0)
                                               <= COALESCE(num_personas, 32767)),
  CONSTRAINT composicion_escolar_chk  CHECK (escolar_estado IN ('siguen_asistiendo','dejaron_de_asistir')),
  CONSTRAINT composicion_escolar_ninos_chk CHECK (escolar_estado IS NULL OR num_ninos > 0),
  CONSTRAINT composicion_escolar_dias_chk  CHECK (escolar_dias IS NULL OR (escolar_dias >= 0 AND escolar_estado = 'dejaron_de_asistir')),
  CONSTRAINT composicion_manejo_chk   CHECK (escolar_manejo IN ('normalidad','con_dificultades','no_estudia','otro')),
  CONSTRAINT composicion_manejo_otro_chk CHECK (escolar_manejo_otro IS NULL OR escolar_manejo = 'otro')
);

CREATE TABLE vivienda_danos (
  id_hogar        bigint PRIMARY KEY REFERENCES hogar ON DELETE CASCADE,
  -- vivienda
  material_paredes varchar(40),
  nivel_agua      varchar(20),
  inundada_antes  varchar(10),
  medio_alerta    varchar(20),
  medio_alerta_otro varchar(150),
  pernocta        varchar(30),
  ingresos        varchar(20),
  ingresos_otro   varchar(150),
  electrica_danada boolean,
  lodo            varchar(10),
  acceso          varchar(15),
  vivienda_vista  boolean,
  -- daños: 0 sin daño, 1 leve, 2 moderado, 3 severo, 4 pérdida total
  dano_estructura smallint,
  dano_techo_puertas_ventanas smallint,
  dano_instalaciones smallint,
  dano_muebles_electrodomesticos smallint,
  dano_ropa_enseres smallint,
  dano_herramientas_trabajo smallint,
  dano_documentos smallint,
  dano_animales   smallint,
  total_dano      smallint GENERATED ALWAYS AS (
    COALESCE(dano_estructura,0) + COALESCE(dano_techo_puertas_ventanas,0) + COALESCE(dano_instalaciones,0) +
    COALESCE(dano_muebles_electrodomesticos,0) + COALESCE(dano_ropa_enseres,0) +
    COALESCE(dano_herramientas_trabajo,0) + COALESCE(dano_documentos,0) + COALESCE(dano_animales,0)) STORED,
  CONSTRAINT vivienda_material_chk CHECK (material_paredes IN
    ('concreto_ladrillo','madera_tablaroca','bahareque_adobe','zinc_carton_madera_no_tratada','reciclado_desecho')),
  CONSTRAINT vivienda_agua_chk     CHECK (nivel_agua IN ('no_entro','tobillo','rodilla','cintura','pecho','techo')),
  CONSTRAINT vivienda_antes_chk    CHECK (inundada_antes IN ('si','no','no_sabe')),
  CONSTRAINT vivienda_alerta_chk   CHECK (medio_alerta IN ('alerta_oficial','vecinos','sirena','no_se_entero','otro')),
  CONSTRAINT vivienda_alerta_otro_chk CHECK (medio_alerta_otro IS NULL OR medio_alerta = 'otro'),
  CONSTRAINT vivienda_pernocta_chk CHECK (pernocta IN ('misma_vivienda','familiares_amistades','albergue',
                                     'arrendado_temporal','intemperie_improvisado','sin_lugar')),
  CONSTRAINT vivienda_ingresos_chk CHECK (ingresos IN ('interrumpida_total','reducida_temporal','no_afectada','otro')),
  CONSTRAINT vivienda_ingresos_otro_chk CHECK (ingresos_otro IS NULL OR ingresos = 'otro'),
  CONSTRAINT vivienda_lodo_chk     CHECK (lodo IN ('nada','poco','mucho')),
  CONSTRAINT vivienda_acceso_chk   CHECK (acceso IN ('despejado','con_escombros','bloqueado')),
  CONSTRAINT vivienda_danos_chk    CHECK (
    dano_estructura BETWEEN 0 AND 4 AND dano_techo_puertas_ventanas BETWEEN 0 AND 4 AND dano_instalaciones BETWEEN 0 AND 4
    AND dano_muebles_electrodomesticos BETWEEN 0 AND 4 AND dano_ropa_enseres BETWEEN 0 AND 4
    AND dano_herramientas_trabajo BETWEEN 0 AND 4 AND dano_documentos BETWEEN 0 AND 4 AND dano_animales BETWEEN 0 AND 4)
);

CREATE TABLE necesidades (
  id_hogar        bigint PRIMARY KEY REFERENCES hogar ON DELETE CASCADE,
  -- lo que marcó (códigos); el orden de 'urgentes' es la prioridad 1,2,3
  items           text[] NOT NULL DEFAULT '{}',
  urgentes        text[] NOT NULL DEFAULT '{}',
  detalle_otro    text,                                   -- "otro elemento por condición especial"
  apoyo_emocional boolean,
  num_mascotas    smallint NOT NULL DEFAULT 0,
  CONSTRAINT necesidades_items_chk CHECK (items <@ ARRAY['alimentos','agua_beber','alimento_mascotas','articulos_aseo_personal',
    'higiene_menstrual_reproductiva','productos_limpieza','ayuda_limpiar_lodo_escombros','colchones_camas',
    'ropa_calzado','electrodomesticos','materiales_reparacion','herramientas_insumos_negocio',
    'medicamentos_atencion_medica','utiles_escolares_ninos','otro_condicion_especial']),
  CONSTRAINT necesidades_unico_chk   CHECK (es_unico(items)),
  CONSTRAINT necesidades_urgentes_chk CHECK (urgentes <@ items AND cardinality(urgentes) <= 3 AND es_unico(urgentes)),
  CONSTRAINT necesidades_otro_chk    CHECK (('otro_condicion_especial' = ANY(items)) = (detalle_otro IS NOT NULL)),
  CONSTRAINT necesidades_mascotas_chk CHECK (num_mascotas >= 0)
);

CREATE TABLE atencion (
  id_hogar        bigint PRIMARY KEY REFERENCES hogar ON DELETE CASCADE,
  visitas         text[] NOT NULL DEFAULT '{}',
  visitas_otro    varchar(150),
  censo_previo    varchar(10),
  censo_quien     varchar(150),
  dictamen        varchar(25),
  inscrita_rud    varchar(10),
  oferta_recibida boolean,
  oferta_aceptada boolean,
  ayudas_recibidas text[] NOT NULL DEFAULT '{}',          -- lo que la familia DICE haber recibido ('ninguna' si nada)
  ayudas_otra     varchar(150),
  CONSTRAINT atencion_visitas_chk CHECK (visitas <@ ARRAY['alcaldia_dagrd','jac','cruz_roja_defensa_civil_bomberos','organizacion_voluntarios','otro','nadie']
                                         AND es_unico(visitas) AND (NOT 'nadie' = ANY(visitas) OR cardinality(visitas) = 1)),
  CONSTRAINT atencion_visitas_otro_chk CHECK (visitas_otro IS NULL OR 'otro' = ANY(visitas)),
  CONSTRAINT atencion_censo_chk   CHECK (censo_previo IN ('si','no','no_sabe')),
  CONSTRAINT atencion_censo_quien_chk CHECK (censo_quien IS NULL OR censo_previo = 'si'),
  CONSTRAINT atencion_dictamen_chk CHECK (dictamen IN ('puede_habitarse','evacuacion_temporal','evacuacion_definitiva','nadie_ha_ido')),
  CONSTRAINT atencion_rud_chk     CHECK (inscrita_rud IN ('si','no','no_sabe')),
  CONSTRAINT atencion_oferta_chk  CHECK (oferta_aceptada IS NULL OR oferta_recibida IS TRUE),
  CONSTRAINT atencion_ayudas_chk  CHECK (ayudas_recibidas <@ ARRAY['kit_aseo','alimentos','colchoneta','agua','otra','ninguna']
                                         AND es_unico(ayudas_recibidas) AND (NOT 'ninguna' = ANY(ayudas_recibidas) OR cardinality(ayudas_recibidas) = 1)),
  CONSTRAINT atencion_ayudas_otra_chk CHECK (ayudas_otra IS NULL OR 'otra' = ANY(ayudas_recibidas))
);

CREATE TABLE entrega_ayuda (              -- lo que el equipo SÍ entregó (verificable)
  id_entrega      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_hogar        bigint REFERENCES hogar ON DELETE RESTRICT,
  tipo_ayuda      varchar(30) NOT NULL CHECK (tipo_ayuda IN ('kit_aseo','alimentos','colchoneta','agua','otra')),
  cantidad        numeric CHECK (cantidad > 0),
  fecha_entrega   date,
  entidad_donante varchar(150),
  estado          varchar(15) NOT NULL DEFAULT 'en_revision' CHECK (estado IN ('en_revision','verificada','rechazada')),
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (id_hogar IS NOT NULL OR estado = 'en_revision')
);

CREATE TABLE bitacora (                   -- quién tocó qué; NO guarda valores (no duplica datos personales)
  id_evento       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cuando          timestamptz NOT NULL DEFAULT now(),
  actor           text NOT NULL,
  tabla           text NOT NULL,
  operacion       char(1) NOT NULL CHECK (operacion IN ('I','U','D')),
  id_hogar        bigint
);

CREATE INDEX ON entrega_ayuda (id_hogar);
CREATE INDEX ON necesidades USING gin (items);
CREATE INDEX ON necesidades USING gin (urgentes);
CREATE INDEX ON bitacora (id_hogar);
CREATE INDEX ON hogar (estado, aplicada_por);

-- Un mismo domicilio (+ interior) no se registra dos veces.
CREATE UNIQUE INDEX hogar_contacto_direccion_uq ON hogar_contacto (lower(direccion), COALESCE(lower(interior), ''));

-- ---------------------------------------------------------------------
-- 3. Reglas y automatismos (después de migrar, para no registrar la carga en la bitácora)
-- ---------------------------------------------------------------------
-- Única fuente de verdad de "¿qué falta para completar?". La usan el trigger y la API (pantalla de cierre).
CREATE OR REPLACE FUNCTION hogar_faltantes(p_id bigint) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE h hogar; c composicion; v vivienda_danos; f text[] := '{}';
BEGIN
  SELECT * INTO h FROM hogar WHERE id_hogar = p_id;
  IF NOT FOUND OR NOT h.autoriza_tratamiento THEN RETURN f; END IF;

  IF NOT EXISTS (SELECT 1 FROM hogar_contacto WHERE id_hogar = p_id) THEN
    f := array_append(f, 'datos de contacto del hogar (dirección y nombre)');
  END IF;
  SELECT * INTO c FROM composicion WHERE id_hogar = p_id;
  IF c.resp_es_jefe IS NULL THEN f := array_append(f, 'composición: si quien responde es jefe/a de hogar'); END IF;
  IF c.num_personas IS NULL THEN f := array_append(f, 'composición: número de personas del hogar'); END IF;
  SELECT * INTO v FROM vivienda_danos WHERE id_hogar = p_id;
  IF v.pernocta IS NULL THEN f := array_append(f, 'vivienda: dónde pernoctó la familia'); END IF;
  IF num_nulls(v.dano_estructura, v.dano_techo_puertas_ventanas, v.dano_instalaciones, v.dano_muebles_electrodomesticos,
               v.dano_ropa_enseres, v.dano_herramientas_trabajo, v.dano_documentos, v.dano_animales) > 0 THEN
    f := array_append(f, 'vivienda: el nivel de daño de las 8 categorías');
  END IF;
  RETURN f;
END $$;

CREATE OR REPLACE FUNCTION validar_hogar_completo() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE f text[];
BEGIN
  IF NEW.estado <> 'completo' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE = 'IG001', MESSAGE = 'un hogar nuevo no puede nacer completo';
  END IF;
  IF OLD.estado = 'completo' THEN RETURN NEW; END IF;
  f := hogar_faltantes(NEW.id_hogar);
  IF cardinality(f) > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'IG001', MESSAGE = array_to_string(f, '; ');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION hogar_actualizado() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION tocar_hogar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN UPDATE hogar SET updated_at = now() WHERE id_hogar = NEW.id_hogar; RETURN NULL; END $$;

-- La API fija `app.actor` (quien aplica la ficha) dentro de cada transacción.
CREATE OR REPLACE FUNCTION registrar_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE fila jsonb := to_jsonb(CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END);
BEGIN
  IF TG_OP = 'UPDATE' AND (fila - 'updated_at') = (to_jsonb(OLD) - 'updated_at') THEN RETURN NULL; END IF;  -- sin cambios reales
  INSERT INTO bitacora (actor, tabla, operacion, id_hogar)
  VALUES (COALESCE(NULLIF(current_setting('app.actor', true), ''), session_user), TG_TABLE_NAME, left(TG_OP, 1),
          (fila ->> 'id_hogar')::bigint);
  RETURN NULL;
END $$;

CREATE TRIGGER hogar_validar    BEFORE INSERT OR UPDATE ON hogar FOR EACH ROW EXECUTE FUNCTION validar_hogar_completo();
CREATE TRIGGER hogar_updated_at BEFORE UPDATE ON hogar FOR EACH ROW EXECUTE FUNCTION hogar_actualizado();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hogar_contacto','composicion','vivienda_danos','necesidades','atencion'] LOOP
    EXECUTE format('CREATE TRIGGER tocar_hogar AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION tocar_hogar()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hogar','hogar_contacto','composicion','vivienda_danos','necesidades','atencion','entrega_ayuda'] LOOP
    EXECUTE format('CREATE TRIGGER bitacora AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION registrar_cambio()', t);
  END LOOP;
END $$;

-- Derecho de supresión: borra todo lo de la familia y deja constancia de que no autoriza (el hogar y sus entregas quedan).
CREATE OR REPLACE FUNCTION revocar_consentimiento(p_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM hogar_contacto  WHERE id_hogar = p_id;
  DELETE FROM composicion     WHERE id_hogar = p_id;
  DELETE FROM vivienda_danos  WHERE id_hogar = p_id;
  DELETE FROM necesidades     WHERE id_hogar = p_id;
  DELETE FROM atencion        WHERE id_hogar = p_id;
  UPDATE hogar SET autoriza_tratamiento = false, autoriza_seguimiento = false, estado = 'sin_autorizacion'
   WHERE id_hogar = p_id;
END $$;

-- ---------------------------------------------------------------------
-- 4. Vistas
-- ---------------------------------------------------------------------
-- Las 4 alertas de "seguimiento urgente", definidas UNA vez. Sin datos personales; es vista de definidor
-- (corre con permisos del dueño) para que v_progreso_hogar pueda usarla sin leer tablas sensibles.
CREATE VIEW v_alertas_hogar AS
SELECT a.*,
       (a.duerme_en_riesgo OR a.urgente_salud OR a.urgente_agua_alimento OR a.electrica_riesgo) AS requiere_seguimiento,
       (a.duerme_en_riesgo::int + a.urgente_salud::int + a.urgente_agua_alimento::int + a.electrica_riesgo::int) AS n_alertas
FROM (
  SELECT h.id_hogar,
    COALESCE(v.pernocta IN ('intemperie_improvisado','sin_lugar'), false)  AS duerme_en_riesgo,
    COALESCE('medicamentos_atencion_medica' = ANY(n.urgentes), false)      AS urgente_salud,
    COALESCE(n.urgentes && ARRAY['agua_beber','alimentos'], false)         AS urgente_agua_alimento,
    COALESCE(v.electrica_danada, false)                                    AS electrica_riesgo
  FROM hogar h
  LEFT JOIN vivienda_danos v USING (id_hogar)
  LEFT JOIN necesidades    n USING (id_hogar)
) a;

-- Una fila por hogar con todo el formulario (incluye datos personales: solo coordinación).
-- Ojo: SELECT * se congela al crear la vista; si agregas columnas a una tabla, recrea la vista.
CREATE VIEW v_hogar_completo WITH (security_invoker = true) AS
SELECT *
FROM hogar h
LEFT JOIN hogar_contacto USING (id_hogar)
LEFT JOIN composicion    USING (id_hogar)
LEFT JOIN vivienda_danos USING (id_hogar)
LEFT JOIN necesidades    USING (id_hogar)
LEFT JOIN atencion       USING (id_hogar)
LEFT JOIN v_alertas_hogar USING (id_hogar);

-- Para repartir: hogares completos, con sus alertas, lo urgente y lo que ya se les entregó.
-- Sugerencia de orden:  ORDER BY n_alertas DESC, total_dano DESC, num_personas DESC
-- El teléfono solo aparece si la familia autorizó el seguimiento.
CREATE VIEW v_cola_entrega WITH (security_invoker = true) AS
SELECT v.id_hogar, v.codigo_hogar, v.sector, v.direccion, v.interior, v.callejon, v.nombre_referencia,
       CASE WHEN v.autoriza_seguimiento THEN v.telefono_contacto END AS telefono_seguimiento,
       v.num_personas, v.num_ninos, v.adultos_mayores, v.total_dano, v.pernocta, v.dictamen,
       v.duerme_en_riesgo, v.urgente_salud, v.urgente_agua_alimento, v.electrica_riesgo, v.requiere_seguimiento,
       v.n_alertas,
       v.urgentes, v.items,
       e.entregas_verificadas, e.ultima_entrega, e.ayudas_entregadas
FROM v_hogar_completo v
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE estado = 'verificada')                      AS entregas_verificadas,
         max(fecha_entrega) FILTER (WHERE estado = 'verificada')            AS ultima_entrega,
         array_agg(DISTINCT tipo_ayuda) FILTER (WHERE estado = 'verificada') AS ayudas_entregadas
    FROM entrega_ayuda WHERE id_hogar = v.id_hogar
) e ON true
WHERE v.estado = 'completo';

-- Qué se necesita y dónde, sin nombres ni direcciones (compras y logística).
CREATE VIEW v_demanda_ayuda WITH (security_invoker = true) AS
SELECT COALESCE(h.sector, 'Sin sector') AS sector, i.item,
       count(*)                                          AS hogares,
       count(*) FILTER (WHERE i.item = ANY(n.urgentes))  AS hogares_urgente,
       sum(c.num_personas)                               AS personas
FROM hogar h
JOIN necesidades n USING (id_hogar)
LEFT JOIN composicion c USING (id_hogar)
CROSS JOIN LATERAL unnest(n.items) AS i(item)
WHERE h.estado = 'completo'
GROUP BY 1, 2;

-- Totales anónimos: lo único que se comparte hacia afuera. Los sectores con menos de 5 hogares
-- se agrupan en 'Otros sectores' para que nadie pueda deducir de quién se habla.
CREATE VIEW v_totales_sector WITH (security_invoker = true) AS
SELECT sector, count(*) AS hogares, sum(num_personas) AS personas, sum(num_ninos) AS ninos,
       sum(adultos_mayores) AS adultos_mayores, round(avg(total_dano), 1) AS dano_promedio
FROM (
  SELECT CASE WHEN count(*) OVER (PARTITION BY COALESCE(sector, '')) < 5 THEN 'Otros sectores'
              ELSE COALESCE(sector, 'Sin sector') END AS sector,
         num_personas, num_ninos, adultos_mayores, total_dano
  FROM v_hogar_completo WHERE estado = 'completo'
) t
GROUP BY sector;

-- Lo único que la API de voluntarios puede leer: avance de la ficha y alertas, jamás datos personales.
-- (Vista de definidor: se ejecuta con permisos del dueño, así rol_formulario no necesita leer las tablas sensibles.)
CREATE VIEW v_progreso_hogar AS
SELECT h.id_hogar, h.ref, h.codigo_hogar, h.estado, h.sector, h.fecha_aplicacion, h.aplicada_por, h.updated_at,
       EXISTS (SELECT 1 FROM hogar_contacto WHERE id_hogar = h.id_hogar) AS paso_contacto,
       (c.id_hogar IS NOT NULL) AS paso_composicion,
       (v.id_hogar IS NOT NULL) AS paso_vivienda,
       (n.id_hogar IS NOT NULL) AS paso_necesidades,
       EXISTS (SELECT 1 FROM atencion WHERE id_hogar = h.id_hogar) AS paso_atencion,
       c.num_personas, c.num_ninos, c.adultos_mayores, v.total_dano,
       a.duerme_en_riesgo, a.urgente_salud, a.urgente_agua_alimento, a.electrica_riesgo, a.requiere_seguimiento
FROM hogar h
LEFT JOIN composicion    c ON c.id_hogar = h.id_hogar
LEFT JOIN vivienda_danos v ON v.id_hogar = h.id_hogar
LEFT JOIN necesidades    n ON n.id_hogar = h.id_hogar
JOIN v_alertas_hogar     a ON a.id_hogar = h.id_hogar;

-- ---------------------------------------------------------------------
-- 5. Seguridad
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_formulario')  THEN CREATE ROLE rol_formulario  NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_coordinacion') THEN CREATE ROLE rol_coordinacion NOLOGIN; END IF;
END $$;

-- 5.1 Row Level Security en todo: sin política, nadie que no sea dueño ve nada.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
  END LOOP;
END $$;

-- 5.2 La API pública de Supabase no toca nada (sin esto las tablas nuevas quedan abiertas por los privilegios por defecto).
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;

-- Las funciones con SECURITY DEFINER no se ejecutan desde fuera salvo permiso explícito.
REVOKE EXECUTE ON FUNCTION hogar_faltantes(bigint), revocar_consentimiento(bigint),
                           tocar_hogar(), registrar_cambio() FROM PUBLIC;

-- 5.3 rol_formulario = la API de voluntarios. Mínimo privilegio:
--     escribe las secciones, NO puede leer hogar_contacto (solo su id) ni borrar nada.
GRANT USAGE ON SCHEMA public TO rol_formulario, rol_coordinacion;
GRANT SELECT, INSERT, UPDATE ON hogar, composicion, vivienda_danos, necesidades, atencion TO rol_formulario;
GRANT INSERT, UPDATE ON hogar_contacto TO rol_formulario;
GRANT SELECT (id_hogar) ON hogar_contacto TO rol_formulario;
GRANT SELECT ON v_progreso_hogar TO rol_formulario;
GRANT EXECUTE ON FUNCTION hogar_faltantes(bigint) TO rol_formulario, rol_coordinacion;

-- 5.4 rol_coordinacion = quien decide y reparte: lee todo, registra entregas, puede revocar consentimientos.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rol_coordinacion;
GRANT INSERT, UPDATE ON entrega_ayuda TO rol_coordinacion;
REVOKE SELECT ON v_progreso_hogar FROM rol_coordinacion;
GRANT EXECUTE ON FUNCTION revocar_consentimiento(bigint) TO rol_coordinacion;

-- 5.5 Políticas RLS para esos dos roles (el dueño y service_role las ignoran).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hogar','composicion','vivienda_danos','necesidades','atencion','hogar_contacto'] LOOP
    EXECUTE format('CREATE POLICY formulario ON %I FOR ALL TO rol_formulario USING (true) WITH CHECK (true)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hogar','composicion','vivienda_danos','necesidades','atencion','hogar_contacto','bitacora'] LOOP
    EXECUTE format('CREATE POLICY coordinacion_lee ON %I FOR SELECT TO rol_coordinacion USING (true)', t);
  END LOOP;
  CREATE POLICY coordinacion_entregas ON entrega_ayuda FOR ALL TO rol_coordinacion USING (true) WITH CHECK (true);
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- DESPUÉS DE EJECUTAR (una vez):
--   CREATE USER api_formulario  PASSWORD '<larga y aleatoria>' IN ROLE rol_formulario;
--   CREATE USER app_coordinacion PASSWORD '<otra>'              IN ROLE rol_coordinacion;
--   → DATABASE_URL de la API pasa a usar api_formulario (no el dueño ni service_role).
--   → Coordinación consulta con app_coordinacion (o desde el panel de Supabase con el dueño).
-- ---------------------------------------------------------------------
