import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CaracterizacionService } from './caracterizacion.service.js';
import { ListarCaracterizacionesDto } from './dto/listar-caracterizaciones.dto.js';
import { CrearCaracterizacionDto } from './dto/crear-caracterizacion.dto.js';

@Controller('caracterizacion')
export class CaracterizacionController {
  constructor(private readonly caracterizacionService: CaracterizacionService) {}

  /** Listas del formulario (categorías y niveles). */
  @Get('catalogos')
  catalogos() {
    return this.caracterizacionService.catalogos();
  }

  /** Familias registradas, de la más reciente a la más antigua. */
  @Get()
  listar(@Query() query: ListarCaracterizacionesDto) {
    return this.caracterizacionService.listar(query.limite ?? 100, query.desde ?? 0);
  }

  /** Detalle completo de una caracterización; `id` es el id de la familia. */
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.caracterizacionService.obtener(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  crear(@Body() dto: CrearCaracterizacionDto) {
    return this.caracterizacionService.crear(dto);
  }
}
