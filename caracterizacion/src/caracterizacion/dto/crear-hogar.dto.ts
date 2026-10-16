import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.js';

export class CrearHogarDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  direccionReferencia!: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
