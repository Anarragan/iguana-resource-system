import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListarCaracterizacionesDto {
  /** Cantidad máxima de familias a devolver (por defecto 100). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limite?: number;

  /** Cuántas familias saltar, para paginar (por defecto 0). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desde?: number;
}
