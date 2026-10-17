import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/trim.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.js';
import {
  ACCESO,
  DICTAMEN,
  GENEROS,
  INGRESOS,
  LODO,
  LUGARES_PERNOCTA,
  MANEJO_ESTUDIOS,
  MATERIALES_PARED,
  MEDIOS_ALERTA,
  NIVELES_AGUA,
  TRI,
} from '../../domain/enums.js';

// ---------- POST /fichas ----------
export class ViviendaDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) direccion!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(50) interior?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(100) callejon?: string;
  @IsOptional() @IsIn(MATERIALES_PARED) materialParedes?: string;
  @IsOptional() @IsIn(NIVELES_AGUA) nivelAguaMax?: string;
  @IsOptional() @IsIn(TRI) inundadaAntes?: string;
}

export class HogarDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) nombreReferencia!: string;
  @Trim() @IsOptional() @Matches(/^[0-9+() -]{7,30}$/, { message: 'telefonoContacto no es válido' }) telefonoContacto?: string;
}

export class CrearFichaDto {
  /** Nombre de quien aplica la ficha; se crea si no existe. */
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) voluntario!: string;
  @IsDateString({ strict: true }) @IsNotFutureDate() fechaAplicacion!: string;
  @IsBoolean() autorizaTratamiento!: boolean;
  @IsOptional() @IsBoolean() autorizaSeguimiento?: boolean;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20) versionConsentimiento!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(1000) observaciones?: string;

  /** Hogar ya registrado (re-aplicar); si falta, `vivienda` y `hogar` son obligatorios al autorizar. */
  @IsOptional() @IsInt() @Min(1) idHogar?: number;
  @IsOptional() @ValidateNested() @Type(() => ViviendaDto) vivienda?: ViviendaDto;
  @IsOptional() @ValidateNested() @Type(() => HogarDto) hogar?: HogarDto;
}

// ---------- PUT /fichas/:id/<paso> ----------
export class RespondenteDto {
  @IsBoolean() esJefe!: boolean;
  @Trim() @IsOptional() @IsString() @MaxLength(60) parentesco?: string;
  @IsOptional() @IsIn(GENEROS) genero?: string;
  @IsOptional() @IsInt() @Min(0) @Max(120) edad?: number;
}

export class EscolaridadDto {
  @IsBoolean() dejaronDeAsistir!: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(32767) diasSinAsistir?: number;
  @IsOptional() @IsIn(MANEJO_ESTUDIOS) manejoEstudios?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) manejoOtro?: string;
}

export class SituacionDto {
  @IsOptional() @IsIn(MEDIOS_ALERTA) medioAlerta?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) medioAlertaOtro?: string;
  @IsOptional() @IsIn(LUGARES_PERNOCTA) lugarPernocta?: string;
  @IsOptional() @IsIn(INGRESOS) ingresos?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) ingresosOtro?: string;
  @IsOptional() @IsBoolean() electricaDanada?: boolean;
  @IsOptional() @IsIn(LODO) lodo?: string;
  @IsOptional() @IsIn(ACCESO) acceso?: string;
  @IsOptional() @IsBoolean() viviendaVista?: boolean;
  @IsOptional() @IsBoolean() apoyoEmocional?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(32767) numMascotas?: number;
}

export class AtencionDto {
  @IsOptional() @IsIn(TRI) censoPrevio?: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) censoQuien?: string;
  @IsOptional() @IsIn(DICTAMEN) dictamen?: string;
  @IsOptional() @IsIn(TRI) inscritaRud?: string;
  @IsOptional() @IsBoolean() ofertaRecibida?: boolean;
  @IsOptional() @IsBoolean() ofertaAceptada?: boolean;
  /** Códigos de tipo_ayuda que la familia dice haber recibido (Mód.4 P5). */
  @IsOptional() @IsArray() @IsString({ each: true }) ayudasRecibidas?: string[];
}

export class DanoDto {
  @IsString() @IsNotEmpty() categoria!: string;
  /** 0 sin daño … 4 pérdida total. */
  @IsInt() @Min(0) @Max(4) nivel!: number;
}
export class DanosDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => DanoDto) danos!: DanoDto[];
}

export class NecesidadDto {
  @IsString() @IsNotEmpty() item!: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) prioridad?: number;
  @Trim() @IsOptional() @IsString() @MaxLength(1000) detalle?: string;
}
export class NecesidadesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => NecesidadDto) necesidades!: NecesidadDto[];
}

export class VisitanteDto {
  @IsString() @IsNotEmpty() actor!: string;
  @Trim() @IsOptional() @IsString() @MaxLength(150) detalle?: string;
}
export class VisitantesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => VisitanteDto) visitantes!: VisitanteDto[];
}

export class GrupoDto {
  @IsString() @IsNotEmpty() grupo!: string;
  @IsInt() @Min(0) @Max(60) cantidad!: number;
}
export class GruposDto {
  @IsDefined() @IsInt() @Min(1) @Max(60) numPersonas!: number;
  /** Edad de cada menor (0-17); el número de niños es su cantidad. */
  @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(17, { each: true }) menores!: number[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => GrupoDto) grupos!: GrupoDto[];
}
