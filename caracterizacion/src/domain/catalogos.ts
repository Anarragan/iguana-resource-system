// Fuente única de los valores permitidos. Deben coincidir con los CHECK de la base.
// El front los consume por GET /caracterizacion/catalogos para poblar las listas.

export interface OpcionCatalogo {
  valor: string;
  etiqueta: string;
}

export const CATEGORIAS_AFECTACION: readonly OpcionCatalogo[] = [
  { valor: 'vivienda', etiqueta: 'Vivienda' },
  { valor: 'enseres', etiqueta: 'Enseres y electrodomésticos' },
  { valor: 'alimentos', etiqueta: 'Alimentos' },
  { valor: 'ropa', etiqueta: 'Ropa' },
  { valor: 'comercio', etiqueta: 'Comercio o negocio' },
  { valor: 'ingresos', etiqueta: 'Ingresos' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const NIVELES_AFECTACION: readonly OpcionCatalogo[] = [
  { valor: 'leve', etiqueta: 'Leve' },
  { valor: 'moderado', etiqueta: 'Moderado' },
  { valor: 'grave', etiqueta: 'Grave' },
  { valor: 'perdida_total', etiqueta: 'Pérdida total' },
];

export const CATEGORIAS_NECESIDAD: readonly OpcionCatalogo[] = [
  { valor: 'alimentacion', etiqueta: 'Alimentación' },
  { valor: 'alojamiento', etiqueta: 'Alojamiento' },
  { valor: 'aseo', etiqueta: 'Aseo' },
  { valor: 'ropa', etiqueta: 'Ropa' },
  { valor: 'enseres', etiqueta: 'Enseres' },
  { valor: 'salud', etiqueta: 'Salud' },
  { valor: 'recuperacion_economica', etiqueta: 'Recuperación económica' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const NIVELES_URGENCIA: readonly OpcionCatalogo[] = [
  { valor: 'baja', etiqueta: 'Baja' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'alta', etiqueta: 'Alta' },
];

/** Todo el levantamiento ocurre en un único sector; la columna hogar.sector es NOT NULL. */
export const SECTOR = 'La Iguaná';

export const valores = (opciones: readonly OpcionCatalogo[]): string[] =>
  opciones.map((o) => o.valor);
