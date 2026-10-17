export type Id = number;

// Valores cerrados: deben coincidir con los CHECK de db/migrations/002_esquema_normalizado.sql.
// Los que pueden crecer (grupos, daños, necesidades, actores, ayudas) son catálogos en la base.
export const TRI = ['si', 'no', 'no_sabe'] as const;
export const GENEROS = ['femenino', 'masculino', 'no_binario_otro', 'prefiere_no_responder'] as const;
export const MATERIALES_PARED = ['concreto_ladrillo', 'madera_tablaroca', 'bahareque_adobe', 'zinc_carton_madera_no_tratada', 'reciclado_desecho'] as const;
export const NIVELES_AGUA = ['no_entro', 'tobillo', 'rodilla', 'cintura', 'pecho', 'techo'] as const;
export const MANEJO_ESTUDIOS = ['normalidad', 'con_dificultades', 'no_estudia', 'otro'] as const;
export const MEDIOS_ALERTA = ['alerta_oficial', 'vecinos', 'sirena', 'no_se_entero', 'otro'] as const;
export const LUGARES_PERNOCTA = ['misma_vivienda', 'familiares_amistades', 'albergue', 'arrendado_temporal', 'intemperie_improvisado', 'sin_lugar'] as const;
export const INGRESOS = ['interrumpida_total', 'reducida_temporal', 'no_afectada', 'otro'] as const;
export const LODO = ['nada', 'poco', 'mucho'] as const;
export const ACCESO = ['despejado', 'con_escombros', 'bloqueado'] as const;
export const DICTAMEN = ['puede_habitarse', 'evacuacion_temporal', 'evacuacion_definitiva', 'nadie_ha_ido'] as const;

export type EstadoFicha = 'borrador' | 'completa' | 'sin_autorizacion';
