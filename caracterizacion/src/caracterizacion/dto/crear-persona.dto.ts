import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/trim.js';
import { IsNotFutureDate } from '../../common/is-not-future-date.js';

export class CrearPersonaDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombres!: string;

  /** Formato AAAA-MM-DD (el front convierte desde dd/mm/aaaa). */
  @IsOptional()
  @IsDateString({ strict: true })
  @IsNotFutureDate()
  fechaNacimiento?: string;

  /** Obligatorio: el formulario exige responder Sí o No. */
  @IsBoolean()
  requiereApoyo!: boolean;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
