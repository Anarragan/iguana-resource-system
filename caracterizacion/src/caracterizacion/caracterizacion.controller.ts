import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CaracterizacionService } from './caracterizacion.service.js';
import { ListarCaracterizacionesDto } from './dto/listar-caracterizaciones.dto.js';
import {
  AtencionDto,
  CrearFichaDto,
  DanosDto,
  EscolaridadDto,
  GruposDto,
  NecesidadesDto,
  RespondenteDto,
  SituacionDto,
  VisitantesDto,
} from './dto/crear-caracterizacion.dto.js';
import { Escolaridad, Respondente, Situacion } from '../domain/entities/secciones.js';

const Id = () => Param('id', ParseIntPipe);

@Controller()
export class CaracterizacionController {
  constructor(private readonly servicio: CaracterizacionService) {}

  /** Las 6 listas del formulario. */
  @Get('catalogos')
  catalogos() {
    return this.servicio.catalogos();
  }

  @Get('fichas')
  listar(@Query() q: ListarCaracterizacionesDto) {
    return this.servicio.listar(q.limite ?? 100, q.desde ?? 0);
  }

  /** Crea la ficha en borrador. */
  @Post('fichas')
  @HttpCode(HttpStatus.CREATED)
  crear(@Body() dto: CrearFichaDto) {
    return this.servicio.crear(dto);
  }

  /** Ficha completa, anidada. */
  @Get('fichas/:id')
  obtener(@Id() id: number) {
    return this.servicio.obtener(id);
  }

  // ---- Un PUT por paso del asistente ----
  @Put('fichas/:id/respondente')
  respondente(@Id() id: number, @Body() dto: RespondenteDto) {
    return this.servicio.guardarUno(id, Respondente, dto);
  }

  @Put('fichas/:id/escolaridad')
  escolaridad(@Id() id: number, @Body() dto: EscolaridadDto) {
    return this.servicio.guardarUno(id, Escolaridad, dto);
  }

  @Put('fichas/:id/situacion')
  situacion(@Id() id: number, @Body() dto: SituacionDto) {
    return this.servicio.guardarUno(id, Situacion, dto);
  }

  @Put('fichas/:id/atencion')
  atencion(@Id() id: number, @Body() dto: AtencionDto) {
    return this.servicio.guardarAtencion(id, dto);
  }

  @Put('fichas/:id/danos')
  danos(@Id() id: number, @Body() dto: DanosDto) {
    return this.servicio.guardarDanos(id, dto);
  }

  @Put('fichas/:id/necesidades')
  necesidades(@Id() id: number, @Body() dto: NecesidadesDto) {
    return this.servicio.guardarNecesidades(id, dto);
  }

  @Put('fichas/:id/visitantes')
  visitantes(@Id() id: number, @Body() dto: VisitantesDto) {
    return this.servicio.guardarVisitantes(id, dto);
  }

  @Put('fichas/:id/grupos')
  grupos(@Id() id: number, @Body() dto: GruposDto) {
    return this.servicio.guardarGrupos(id, dto);
  }

  /** Valida y pasa la ficha a 'completa'. */
  @Post('fichas/:id/completar')
  @HttpCode(HttpStatus.OK)
  completar(@Id() id: number) {
    return this.servicio.completar(id);
  }
}
