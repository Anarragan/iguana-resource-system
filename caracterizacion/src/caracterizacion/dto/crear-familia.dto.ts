import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.js';

export class CrearFamiliaDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreReferencia!: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefonoContacto?: string;
}
