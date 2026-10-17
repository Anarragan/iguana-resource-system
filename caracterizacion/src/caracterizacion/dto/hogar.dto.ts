import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/trim.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.js';
import {
  ACCESO,
  AYUDAS_RECIBIDAS,
  DICTAMEN,
  ESTADOS_ESCOLARES,
  ESTADOS_HOGAR,
  GENEROS,
  INGRESOS,
  ITEMS_NECESIDAD,
  LODO,
  LUGARES_PERNOCTA,
  MANEJO_ESTUDIOS,
  MATERIALES_PARED,
  MEDIOS_ALERTA,
  NIVELES_AGUA,
  TRI,
  VISITAS,
} from '../../domain/enums.js';

// Aquí solo se valida la forma de cada campo. Las reglas entre campos (p. ej. "niños + mayores ≤ personas")
// y lo que falta para completar las hace la base de datos; la API traduce sus errores a mensajes legibles.

const Telefono = () => Matches(/^[0-9+() -]{7,30}$/, { message: 'telefonoContacto no es válido' });
const Conteo = (max = 60) => (target: object, key: string) => {
  IsOptional()(target, key);
  IsInt()(target, key);
  Min(0)(target, key);
  Max(max)(target, key);
};

// ---------- POST /hogares ----------
export class CrearHogarDto {
  /** Quien aplica la ficha. */
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) aplicadaPor!: string;
  @IsOptional() @IsDateString({ strict: true }) @IsNotFutureDate() fechaAplicacion?: string;
  @IsBoolean() autorizaTratamiento!: boolean;
  @IsOptional() @IsBoolean() autorizaSeguimiento?: boolean;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20) versionConsentimiento!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(100) sector?: string;

  // Datos personales: obligatorios solo si autoriza; si no autoriza, la API rechaza que lleguen.
  @ValidateIf((o: CrearHogarDto) => o.autorizaTratamiento === true) @Trim() @IsString() @IsNotEmpty() @MaxLength(200) direccion?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(50) interior?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(100) callejon?: string;
  @ValidateIf((o: CrearHogarDto) => o.autorizaTratamiento === true) @Trim() @IsString() @IsNotEmpty() @MaxLength(150) nombreReferencia?: string;
  @Trim() @IsOptional() @Telefono() telefonoContacto?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
}

// ---------- PUT /hogares/:ref/contacto ----------
export class ContactoDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) direccion!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(50) interior?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(100) callejon?: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) nombreReferencia!: string;
  @Trim() @IsOptional() @Telefono() telefonoContacto?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;
}

// ---------- PUT /hogares/:ref/composicion  (Módulo 1) ----------
export class ComposicionDto {
  @IsOptional() @IsBoolean() respEsJefe?: boolean;
  @Trim() @IsOptional() @IsString() @MaxLength(60) respParentesco?: string;
  @IsOptional() @IsIn(GENEROS) respGenero?: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) respEdad?: number;

  @IsOptional() @IsInt() @Min(1) @Max(60) numPersonas?: number;
  /** Edad (0-17) de cada niño/a; el número de niños es su cantidad. `[]` si no hay. */
  @IsOptional() @IsArray() @ArrayMaxSize(60) @IsInt({ each: true }) @Min(0, { each: true }) @Max(17, { each: true }) ninosEdades?: number[];
  @Conteo() adultosMayores?: number;
  @Conteo() conDiscapacidad?: number;
  @Conteo() embarazoLactancia?: number;
  @Conteo() cuidadosEspeciales?: number;
  @Conteo() cuidadores?: number;
  @Conteo() sostenimiento?: number;

  @IsOptional() @IsIn(ESTADOS_ESCOLARES) escolarEstado?: string;
  @Conteo(32767) escolarDias?: number;
  @IsOptional() @IsIn(MANEJO_ESTUDIOS) escolarManejo?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) escolarManejoOtro?: string;
}

// ---------- PUT /hogares/:ref/vivienda  (Módulo 2: vivienda y daños) ----------
const Dano = () => (target: object, key: string) => {
  IsOptional()(target, key);
  IsInt()(target, key);
  Min(0)(target, key);
  Max(4)(target, key);
};

export class ViviendaDto {
  @IsOptional() @IsIn(MATERIALES_PARED) materialParedes?: string;
  @IsOptional() @IsIn(NIVELES_AGUA) nivelAgua?: string;
  @IsOptional() @IsIn(TRI) inundadaAntes?: string;
  @IsOptional() @IsIn(MEDIOS_ALERTA) medioAlerta?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) medioAlertaOtro?: string;
  @IsOptional() @IsIn(LUGARES_PERNOCTA) pernocta?: string;
  @IsOptional() @IsIn(INGRESOS) ingresos?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) ingresosOtro?: string;
  @IsOptional() @IsBoolean() electricaDanada?: boolean;
  @IsOptional() @IsIn(LODO) lodo?: string;
  @IsOptional() @IsIn(ACCESO) acceso?: string;
  @IsOptional() @IsBoolean() viviendaVista?: boolean;

  /** 0 sin daño · 1 leve · 2 moderado · 3 severo · 4 pérdida total. */
  @Dano() danoEstructura?: number;
  @Dano() danoTechoPuertasVentanas?: number;
  @Dano() danoInstalaciones?: number;
  @Dano() danoMueblesElectrodomesticos?: number;
  @Dano() danoRopaEnseres?: number;
  @Dano() danoHerramientasTrabajo?: number;
  @Dano() danoDocumentos?: number;
  @Dano() danoAnimales?: number;
}

// ---------- PUT /hogares/:ref/necesidades  (Módulo 3) ----------
export class NecesidadesDto {
  /** Códigos marcados. */
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(ITEMS_NECESIDAD, { each: true }) items?: string[];
  /** Hasta 3, entre los marcados; el orden es la prioridad 1, 2, 3. */
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(3) @IsIn(ITEMS_NECESIDAD, { each: true }) urgentes?: string[];
  /** Obligatorio si marcó `otro_condicion_especial`, y solo entonces. */
  @Trim() @IsOptional() @IsString() @MaxLength(1000) detalleOtro?: string;
  @IsOptional() @IsBoolean() apoyoEmocional?: boolean;
  @Conteo(32767) numMascotas?: number;
}

// ---------- PUT /hogares/:ref/atencion  (Módulo 4) ----------
export class AtencionDto {
  /** Quién ha pasado. `nadie` va solo. */
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(VISITAS, { each: true }) visitas?: string[];
  @Trim() @IsOptional() @IsString() @MaxLength(150) visitasOtro?: string;
  @IsOptional() @IsIn(TRI) censoPrevio?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) censoQuien?: string;
  @IsOptional() @IsIn(DICTAMEN) dictamen?: string;
  @IsOptional() @IsIn(TRI) inscritaRud?: string;
  @IsOptional() @IsBoolean() ofertaRecibida?: boolean;
  @IsOptional() @IsBoolean() ofertaAceptada?: boolean;
  /** Lo que la familia DICE haber recibido; `ninguna` va sola. */
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(AYUDAS_RECIBIDAS, { each: true }) ayudasRecibidas?: string[];
  @Trim() @IsOptional() @IsString() @MaxLength(150) ayudasOtra?: string;
}

// ---------- GET /hogares ----------
export class ListarHogaresDto {
  @IsOptional() @IsIn(ESTADOS_HOGAR) estado?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) aplicadaPor?: string;
  /** Cantidad máxima de hogares a devolver (por defecto 100). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limite?: number;
  /** Cuántos saltar, para paginar (por defecto 0). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) desde?: number;
}
