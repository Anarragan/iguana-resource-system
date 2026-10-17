// Pasos del asistente que se guardan con un UPSERT en una tabla 1:1 con hogar (PK = id_hogar).
// `campos` son los nombres del DTO (camelCase); la columna es el mismo nombre en snake_case.
// Las columnas calculadas por la base (num_ninos, total_dano) no están aquí a propósito.
export const SECCIONES = {
  composicion: {
    tabla: 'composicion',
    campos: [
      'respEsJefe', 'respParentesco', 'respGenero', 'respEdad',
      'numPersonas', 'ninosEdades', 'adultosMayores', 'conDiscapacidad', 'embarazoLactancia',
      'cuidadosEspeciales', 'cuidadores', 'sostenimiento',
      'escolarEstado', 'escolarDias', 'escolarManejo', 'escolarManejoOtro',
    ],
  },
  vivienda: {
    tabla: 'vivienda_danos',
    campos: [
      'materialParedes', 'nivelAgua', 'inundadaAntes', 'medioAlerta', 'medioAlertaOtro', 'pernocta',
      'ingresos', 'ingresosOtro', 'electricaDanada', 'lodo', 'acceso', 'viviendaVista',
      'danoEstructura', 'danoTechoPuertasVentanas', 'danoInstalaciones', 'danoMueblesElectrodomesticos',
      'danoRopaEnseres', 'danoHerramientasTrabajo', 'danoDocumentos', 'danoAnimales',
    ],
  },
  necesidades: {
    tabla: 'necesidades',
    campos: ['items', 'urgentes', 'detalleOtro', 'apoyoEmocional', 'numMascotas'],
  },
  atencion: {
    tabla: 'atencion',
    campos: [
      'visitas', 'visitasOtro', 'censoPrevio', 'censoQuien', 'dictamen', 'inscritaRud',
      'ofertaRecibida', 'ofertaAceptada', 'ayudasRecibidas', 'ayudasOtra',
    ],
  },
} as const;

export type Seccion = keyof typeof SECCIONES;

export const snake = (camel: string) => camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
