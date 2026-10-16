import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/trim.js';
import {
  CATEGORIAS_AFECTACION,
  NIVELES_AFECTACION,
  valores,
} from '../../domain/catalogos.js';

export class CrearAfectacionDto {
  @IsIn(valores(CATEGORIAS_AFECTACION))
  categoria!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion!: string;

  @IsIn(valores(NIVELES_AFECTACION))
  nivelAfectacion!: string;
}
