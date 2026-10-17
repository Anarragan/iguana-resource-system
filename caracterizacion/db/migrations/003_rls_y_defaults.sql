-- 1) Seguridad: activa RLS en todas las tablas (Supabase las muestra "Unrestricted" sin RLS).
--    Sin políticas, la API pública de Supabase (anon/authenticated) no ve ni escribe nada.
--    El backend se conecta con el usuario dueño de las tablas, que no se ve afectado.
-- 2) Datos esenciales: nunca NULL; si no se responde, toman un valor por defecto neutro.
--    Es idempotente: se puede ejecutar más de una vez.
BEGIN;

-- ---------- RLS ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Las vistas respetan el RLS de quien consulta (si no, saltarían la protección).
ALTER VIEW v_ficha_resumen       SET (security_invoker = true);
ALTER VIEW v_seguimiento_urgente SET (security_invoker = true);

-- ---------- Defaults: primero se rellenan los NULL existentes, luego NOT NULL ----------
-- vivienda
UPDATE vivienda SET inundada_antes = 'no_sabe' WHERE inundada_antes IS NULL;
ALTER TABLE vivienda
  ALTER COLUMN inundada_antes SET DEFAULT 'no_sabe',
  ALTER COLUMN inundada_antes SET NOT NULL;

-- ficha_respondente
UPDATE ficha_respondente SET genero = 'prefiere_no_responder' WHERE genero IS NULL;
ALTER TABLE ficha_respondente
  ALTER COLUMN genero SET DEFAULT 'prefiere_no_responder',
  ALTER COLUMN genero SET NOT NULL;

-- ficha_situacion (las alertas de seguimiento dependen de estos campos)
UPDATE ficha_situacion SET electrica_danada = false WHERE electrica_danada IS NULL;
UPDATE ficha_situacion SET vivienda_vista   = false WHERE vivienda_vista   IS NULL;
UPDATE ficha_situacion SET apoyo_emocional  = false WHERE apoyo_emocional  IS NULL;
ALTER TABLE ficha_situacion
  ALTER COLUMN electrica_danada SET DEFAULT false, ALTER COLUMN electrica_danada SET NOT NULL,
  ALTER COLUMN vivienda_vista   SET DEFAULT false, ALTER COLUMN vivienda_vista   SET NOT NULL,
  ALTER COLUMN apoyo_emocional  SET DEFAULT false, ALTER COLUMN apoyo_emocional  SET NOT NULL;

-- ficha_atencion
UPDATE ficha_atencion SET censo_previo = 'no_sabe' WHERE censo_previo IS NULL;
UPDATE ficha_atencion SET inscrita_rud = 'no_sabe' WHERE inscrita_rud IS NULL;
UPDATE ficha_atencion SET dictamen = 'nadie_ha_ido' WHERE dictamen IS NULL;
UPDATE ficha_atencion SET oferta_recibida = false WHERE oferta_recibida IS NULL;
ALTER TABLE ficha_atencion
  ALTER COLUMN censo_previo    SET DEFAULT 'no_sabe',      ALTER COLUMN censo_previo    SET NOT NULL,
  ALTER COLUMN inscrita_rud    SET DEFAULT 'no_sabe',      ALTER COLUMN inscrita_rud    SET NOT NULL,
  ALTER COLUMN dictamen        SET DEFAULT 'nadie_ha_ido', ALTER COLUMN dictamen        SET NOT NULL,
  ALTER COLUMN oferta_recibida SET DEFAULT false,          ALTER COLUMN oferta_recibida SET NOT NULL;
-- oferta_aceptada queda NULL a propósito: solo tiene sentido si oferta_recibida = true.

COMMIT;
