-- =====================================================================
-- Caracterización La Iguaná – esquema normalizado (3NF), PostgreSQL
--
--  1. Lo que se repite (daños, necesidades, ayudas, visitantes, grupos) son FILAS, no columnas.
--  2. Las listas que pueden crecer son tablas catálogo con PK = codigo (texto estable).
--  3. Valores cerrados y pequeños (sí/no/no sabe, niveles de agua…) son CHECK.
--  4. Lo calculable (total de daño, nº de niños, alertas urgentes) va en vistas.
--  5. La ficha se parte en secciones 1:1 que replican los módulos del formulario.
--
-- REEMPLAZA el esquema v1 (hogar/familia/persona/afectacion/necesidad/entrega_ayuda):
-- borra esas tablas y sus datos. Respalda antes de ejecutar.
-- =====================================================================
BEGIN;

DROP VIEW  IF EXISTS v_totales_sector, v_seguimiento_urgente, v_ficha_dano, v_ficha_resumen;
DROP TABLE IF EXISTS entrega_ayuda, afectacion, necesidad, persona, ficha, familia, hogar CASCADE;

-- ---------- CATÁLOGOS ----------
CREATE TABLE grupo_integrantes (
  codigo   varchar(30) PRIMARY KEY,
  etiqueta varchar(120) NOT NULL,
  orden    smallint NOT NULL
);

CREATE TABLE categoria_dano (
  codigo   varchar(40) PRIMARY KEY,
  etiqueta varchar(120) NOT NULL,
  orden    smallint NOT NULL
);

CREATE TABLE grupo_necesidad (
  codigo   varchar(30) PRIMARY KEY,
  etiqueta varchar(120) NOT NULL,
  orden    smallint NOT NULL
);

CREATE TABLE item_necesidad (
  codigo   varchar(40) PRIMARY KEY,
  grupo    varchar(30) NOT NULL REFERENCES grupo_necesidad(codigo),
  etiqueta varchar(150) NOT NULL,
  orden    smallint NOT NULL
);

CREATE TABLE actor (
  codigo   varchar(40) PRIMARY KEY,
  etiqueta varchar(120) NOT NULL
);

CREATE TABLE tipo_ayuda (
  codigo   varchar(30) PRIMARY KEY,
  etiqueta varchar(120) NOT NULL
);

-- ---------- NÚCLEO ----------
CREATE TABLE vivienda (
  id_vivienda     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  direccion       text NOT NULL,
  interior        varchar(50),
  callejon        varchar(100),
  sector          varchar(100) NOT NULL,
  material_paredes varchar(40) CHECK (material_paredes IN
    ('concreto_ladrillo','madera_tablaroca','bahareque_adobe','zinc_carton_madera_no_tratada','reciclado_desecho')),
  nivel_agua_max  varchar(20) CHECK (nivel_agua_max IN ('no_entro','tobillo','rodilla','cintura','pecho','techo')),
  inundada_antes  varchar(10) CHECK (inundada_antes IN ('si','no','no_sabe')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hogar (
  id_hogar        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_hogar    varchar(20) NOT NULL UNIQUE,
  id_vivienda     bigint NOT NULL REFERENCES vivienda ON DELETE RESTRICT,
  nombre_referencia varchar(150) NOT NULL,
  telefono_contacto varchar(30),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE voluntario (
  id_voluntario   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          varchar(150) NOT NULL UNIQUE
);

-- ---------- FICHA (cabecera + Módulo 0) ----------
CREATE TABLE ficha (
  id_ficha        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_hogar        bigint NOT NULL REFERENCES hogar ON DELETE RESTRICT,
  id_voluntario   bigint NOT NULL REFERENCES voluntario,
  fecha_aplicacion date NOT NULL,
  estado          varchar(20) NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador','completa','sin_autorizacion')),
  autoriza_tratamiento boolean NOT NULL,
  autoriza_seguimiento boolean NOT NULL DEFAULT false,
  version_consentimiento varchar(20) NOT NULL,
  num_personas    smallint CHECK (num_personas BETWEEN 1 AND 60),
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ficha_consent_chk CHECK ((NOT autoriza_tratamiento) = (estado = 'sin_autorizacion')),
  CONSTRAINT ficha_completa_chk CHECK (estado <> 'completa' OR num_personas IS NOT NULL)
);
CREATE UNIQUE INDEX ficha_una_completa ON ficha (id_hogar) WHERE estado = 'completa';

-- ---------- SECCIONES 1:1 (PK = FK) ----------
CREATE TABLE ficha_respondente (
  id_ficha        bigint PRIMARY KEY REFERENCES ficha ON DELETE CASCADE,
  es_jefe         boolean NOT NULL,
  parentesco      varchar(60),
  genero          varchar(25) CHECK (genero IN ('femenino','masculino','no_binario_otro','prefiere_no_responder')),
  edad            smallint CHECK (edad BETWEEN 0 AND 120),
  CHECK (parentesco IS NULL OR es_jefe = false)
);

CREATE TABLE ficha_escolaridad (
  id_ficha        bigint PRIMARY KEY REFERENCES ficha ON DELETE CASCADE,
  dejaron_de_asistir boolean NOT NULL,
  dias_sin_asistir smallint CHECK (dias_sin_asistir >= 0),
  manejo_estudios varchar(20) CHECK (manejo_estudios IN ('normalidad','con_dificultades','no_estudia','otro')),
  manejo_otro     varchar(150),
  CHECK (dias_sin_asistir IS NULL OR dejaron_de_asistir)
);

CREATE TABLE ficha_situacion (
  id_ficha        bigint PRIMARY KEY REFERENCES ficha ON DELETE CASCADE,
  medio_alerta    varchar(20) CHECK (medio_alerta IN ('alerta_oficial','vecinos','sirena','no_se_entero','otro')),
  medio_alerta_otro varchar(150),
  lugar_pernocta  varchar(30) CHECK (lugar_pernocta IN
    ('misma_vivienda','familiares_amistades','albergue','arrendado_temporal','intemperie_improvisado','sin_lugar')),
  ingresos        varchar(20) CHECK (ingresos IN ('interrumpida_total','reducida_temporal','no_afectada','otro')),
  ingresos_otro   varchar(150),
  electrica_danada boolean,
  lodo            varchar(10) CHECK (lodo IN ('nada','poco','mucho')),
  acceso          varchar(15) CHECK (acceso IN ('despejado','con_escombros','bloqueado')),
  vivienda_vista  boolean,
  apoyo_emocional boolean,
  num_mascotas    smallint NOT NULL DEFAULT 0 CHECK (num_mascotas >= 0)
);

CREATE TABLE ficha_atencion (
  id_ficha        bigint PRIMARY KEY REFERENCES ficha ON DELETE CASCADE,
  censo_previo    varchar(10) CHECK (censo_previo IN ('si','no','no_sabe')),
  censo_quien     varchar(150),
  dictamen        varchar(25) CHECK (dictamen IN ('puede_habitarse','evacuacion_temporal','evacuacion_definitiva','nadie_ha_ido')),
  inscrita_rud    varchar(10) CHECK (inscrita_rud IN ('si','no','no_sabe')),
  oferta_recibida boolean,
  oferta_aceptada boolean,
  CHECK (oferta_aceptada IS NULL OR oferta_recibida)
);

-- ---------- LO REPETIDO: FILAS ----------
CREATE TABLE ficha_menor (
  id_menor        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_ficha        bigint NOT NULL REFERENCES ficha ON DELETE CASCADE,
  edad            smallint NOT NULL CHECK (edad BETWEEN 0 AND 17)
);

CREATE TABLE ficha_grupo (
  id_ficha        bigint NOT NULL REFERENCES ficha ON DELETE CASCADE,
  grupo           varchar(30) NOT NULL REFERENCES grupo_integrantes,
  cantidad        smallint NOT NULL CHECK (cantidad >= 0),
  PRIMARY KEY (id_ficha, grupo)
);

CREATE TABLE dano (
  id_ficha        bigint NOT NULL REFERENCES ficha ON DELETE CASCADE,
  categoria       varchar(40) NOT NULL REFERENCES categoria_dano,
  nivel           smallint NOT NULL CHECK (nivel BETWEEN 0 AND 4),
  PRIMARY KEY (id_ficha, categoria)
);

CREATE TABLE necesidad (
  id_necesidad    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_ficha        bigint NOT NULL REFERENCES ficha ON DELETE CASCADE,
  item            varchar(40) NOT NULL REFERENCES item_necesidad,
  prioridad       smallint CHECK (prioridad BETWEEN 1 AND 3),
  detalle         text,
  estado          varchar(15) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','atendida','descartada')),
  UNIQUE (id_ficha, item)
);
CREATE UNIQUE INDEX necesidad_prioridad_unica ON necesidad (id_ficha, prioridad) WHERE prioridad IS NOT NULL;

CREATE TABLE ficha_visitante (
  id_ficha        bigint NOT NULL REFERENCES ficha ON DELETE CASCADE,
  actor           varchar(40) NOT NULL REFERENCES actor,
  detalle         varchar(150),
  PRIMARY KEY (id_ficha, actor)
);

CREATE TABLE entrega_ayuda (
  id_entrega      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_hogar        bigint REFERENCES hogar ON DELETE RESTRICT,
  id_ficha        bigint REFERENCES ficha ON DELETE SET NULL,
  tipo_ayuda      varchar(30) NOT NULL REFERENCES tipo_ayuda,
  cantidad        numeric,
  fecha_entrega   date,
  entidad_donante varchar(150),
  estado          varchar(15) NOT NULL CHECK (estado IN ('reportada','en_revision','verificada','rechazada')),
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entrega_hogar_chk CHECK (id_hogar IS NOT NULL OR estado = 'en_revision')
);

-- ---------- ÍNDICES ----------
CREATE INDEX ON hogar (id_vivienda);
CREATE INDEX ON ficha (id_hogar);
CREATE INDEX ON necesidad (item);
CREATE INDEX ON entrega_ayuda (id_hogar);
CREATE INDEX ON entrega_ayuda (id_ficha);

-- ---------- VISTAS ----------
CREATE VIEW v_ficha_resumen AS
SELECT f.id_ficha, f.id_hogar, f.num_personas,
  (SELECT count(*)               FROM ficha_menor m WHERE m.id_ficha = f.id_ficha)                 AS ninos,
  (SELECT cantidad FROM ficha_grupo g WHERE g.id_ficha = f.id_ficha AND g.grupo = 'adulto_mayor')  AS adultos_mayores,
  (SELECT COALESCE(sum(nivel),0) FROM dano d WHERE d.id_ficha = f.id_ficha)                        AS total_dano
FROM ficha f;

CREATE VIEW v_seguimiento_urgente AS
SELECT f.id_ficha, f.id_hogar,
  COALESCE(s.lugar_pernocta IN ('intemperie_improvisado','sin_lugar'), false) AS duerme_en_riesgo,
  EXISTS (SELECT 1 FROM necesidad n WHERE n.id_ficha = f.id_ficha AND n.prioridad IS NOT NULL
          AND n.item = 'medicamentos_atencion_medica')                        AS urgente_salud,
  EXISTS (SELECT 1 FROM necesidad n WHERE n.id_ficha = f.id_ficha AND n.prioridad IS NOT NULL
          AND n.item IN ('agua_beber','alimentos'))                           AS urgente_agua_alimento,
  COALESCE(s.electrica_danada, false)                                         AS electrica_riesgo
FROM ficha f
LEFT JOIN ficha_situacion s ON s.id_ficha = f.id_ficha
WHERE f.estado = 'completa';

-- ---------- DATOS INICIALES DE LOS CATÁLOGOS ----------
INSERT INTO grupo_integrantes VALUES
 ('adulto_mayor','Personas adultas mayores (60+)',1),
 ('discapacidad','Personas con discapacidad o diversidad funcional',2),
 ('embarazo_lactancia','Mujeres embarazadas o en lactancia',3),
 ('cuidado_especial','Personas que requieren cuidados especiales',4),
 ('cuida_hogar','Personas que asumen el cuidado del hogar',5),
 ('sostiene_hogar','Personas que asumen el sostenimiento económico',6);

INSERT INTO categoria_dano VALUES
 ('estructura','Estructura (paredes, pisos, cimientos)',1),
 ('techo_puertas_ventanas','Techo, puertas y ventanas',2),
 ('instalaciones','Instalaciones (luz, agua, baño)',3),
 ('muebles_electrodomesticos','Muebles y electrodomésticos',4),
 ('ropa_enseres','Ropa y enseres',5),
 ('herramientas_trabajo','Herramientas de trabajo o negocio',6),
 ('documentos','Documentos',7),
 ('animales','Animales',8);

INSERT INTO grupo_necesidad VALUES
 ('alimentacion','Alimentación',1),('aseo_personal','Aseo personal',2),
 ('higiene_menstrual','Higiene menstrual y reproductiva',3),('aseo_hogar','Aseo del hogar',4),
 ('enseres_vivienda','Enseres y vivienda',5),('trabajo','Trabajo',6),('salud_cuidado','Salud y cuidado',7);

INSERT INTO item_necesidad VALUES
 ('alimentos','alimentacion','Alimentos',1),
 ('agua_beber','alimentacion','Agua para beber',2),
 ('alimento_mascotas','alimentacion','Alimento para mascotas',3),
 ('articulos_aseo_personal','aseo_personal','Artículos de aseo personal',1),
 ('higiene_menstrual_reproductiva','higiene_menstrual','Artículos de higiene menstrual y reproductiva',1),
 ('productos_limpieza','aseo_hogar','Productos de limpieza',1),
 ('ayuda_limpiar_lodo_escombros','aseo_hogar','Ayuda para limpiar lodo o sacar escombros',2),
 ('colchones_camas','enseres_vivienda','Colchones o camas',1),
 ('ropa_calzado','enseres_vivienda','Ropa y calzado',2),
 ('electrodomesticos','enseres_vivienda','Estufa, nevera u otros electrodomésticos',3),
 ('materiales_reparacion','enseres_vivienda','Materiales para reparar la vivienda',4),
 ('herramientas_insumos_negocio','trabajo','Herramientas de trabajo o insumos del negocio',1),
 ('medicamentos_atencion_medica','salud_cuidado','Medicamentos o atención médica',1),
 ('utiles_escolares_ninos','salud_cuidado','Útiles escolares o elementos para niños, niñas y adolescentes',2),
 ('otro_condicion_especial','salud_cuidado','Otro elemento por condición especial',3);

INSERT INTO actor VALUES
 ('alcaldia_dagrd','Alcaldía / DAGRD'),('jac','Junta de Acción Comunal'),
 ('cruz_roja_defensa_civil_bomberos','Cruz Roja, Defensa Civil o Bomberos'),
 ('organizacion_voluntarios','Organización o voluntarios'),('otro','Otro'),('nadie','Nadie');

INSERT INTO tipo_ayuda VALUES
 ('kit_aseo','Kit de aseo'),('alimentos','Alimentos'),('colchoneta','Colchoneta'),('agua','Agua'),('otra','Otra');

COMMIT;
