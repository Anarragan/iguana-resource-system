export type Id = number;

export type EstadoVerificacionFamilia =
  | "pendiente"
  | "verificada"
  | "requiere_revision";

export type CategoriaAfectacion =
  | "vivienda"
  | "enseres"
  | "alimentos"
  | "ropa"
  | "comercio"
  | "ingresos"
  | "otro";

export type NivelAfectacion =
  | "leve"
  | "moderado"
  | "grave"
  | "perdida_total";

export type EstadoVerificacionAfectacion =
  | "declarada"
  | "verificada"
  | "requiere_revision";

export type CategoriaNecesidad =
  | "alimentacion"
  | "alojamiento"
  | "aseo"
  | "ropa"
  | "enseres"
  | "salud"
  | "recuperacion_economica"
  | "otro";

export type NivelUrgencia = "baja" | "media" | "alta";

export type EstadoNecesidad =
  | "pendiente"
  | "atendida_parcialmente"
  | "cubierta";

export type EstadoVerificacionEntrega =
  | "reportada"
  | "corroborada"
  | "verificada"
  | "en_revision";

