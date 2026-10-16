import { ArrayMinSize, IsArray, IsDefined, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CrearHogarDto } from './crear-hogar.dto.js';
import { CrearFamiliaDto } from './crear-familia.dto.js';
import { CrearPersonaDto } from './crear-persona.dto.js';
import { CrearAfectacionDto } from './crear-afectacion.dto.js';
import { CrearNecesidadDto } from './crear-necesidad.dto.js';

export class CrearCaracterizacionDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CrearHogarDto)
  hogar!: CrearHogarDto;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CrearFamiliaDto)
  familia!: CrearFamiliaDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrearPersonaDto)
  personas!: CrearPersonaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearAfectacionDto)
  afectaciones!: CrearAfectacionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearNecesidadDto)
  necesidades!: CrearNecesidadDto[];
}
