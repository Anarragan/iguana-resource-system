import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.js';
import {
  CATEGORIAS_NECESIDAD,
  NIVELES_URGENCIA,
  valores,
} from '../../domain/catalogos.js';

export class CrearNecesidadDto {
  @IsIn(valores(CATEGORIAS_NECESIDAD))
  categoria!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion!: string;

  @IsIn(valores(NIVELES_URGENCIA))
  nivelUrgencia!: string;
}
