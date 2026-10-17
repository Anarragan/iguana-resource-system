import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from '../seguridad/publica.js';
import { CaracterizacionService } from './caracterizacion.service.js';
import {
  AtencionDto,
  ComposicionDto,
  ContactoDto,
  CrearHogarDto,
  ListarHogaresDto,
  NecesidadesDto,
  ViviendaDto,
} from './dto/hogar.dto.js';

const Ref = () => Param('ref', new ParseUUIDPipe());

/**
 * API de los voluntarios: solo recolecta. Escribe datos y devuelve avance (qué pasos van, qué falta, alertas),
 * pero NO existe ningún endpoint que devuelva nombres, direcciones, teléfonos ni las respuestas de una familia.
 * Eso se consulta en la base de datos (vistas v_cola_entrega, v_demanda_ayuda, v_totales_sector…).
 */
@Controller()
export class CaracterizacionController {
  constructor(private readonly servicio: CaracterizacionService) {}

  @Public()
  @Get('salud')
  salud() {
    return { estado: 'ok' };
  }

  /** Opciones y etiquetas de todas las preguntas. */
  @Get('catalogos')
  catalogos() {
    return this.servicio.catalogos();
  }

  /** Avance de los hogares (sin datos personales). */
  @Get('hogares')
  listar(@Query() q: ListarHogaresDto) {
    return this.servicio.listar(q);
  }

  /** Momento cero: consentimiento + contacto. Devuelve `ref` (para las demás rutas) y `codigo` (para decirlo en voz alta). */
  @Post('hogares')
  @HttpCode(HttpStatus.CREATED)
  crear(@Body() dto: CrearHogarDto) {
    return this.servicio.crear(dto);
  }

  /** Dónde va la ficha, qué falta para completarla y las alertas calculadas. */
  @Get('hogares/:ref/progreso')
  progreso(@Ref() ref: string) {
    return this.servicio.obtenerProgreso(ref);
  }

  // ---- Un PUT por paso del asistente; cada uno reemplaza su paso completo ----
  @Put('hogares/:ref/contacto')
  contacto(@Ref() ref: string, @Body() dto: ContactoDto) {
    return this.servicio.guardarContacto(ref, dto);
  }

  @Put('hogares/:ref/composicion')
  composicion(@Ref() ref: string, @Body() dto: ComposicionDto) {
    return this.servicio.guardarSeccion(ref, 'composicion', dto);
  }

  @Put('hogares/:ref/vivienda')
  vivienda(@Ref() ref: string, @Body() dto: ViviendaDto) {
    return this.servicio.guardarSeccion(ref, 'vivienda', dto);
  }

  @Put('hogares/:ref/necesidades')
  necesidades(@Ref() ref: string, @Body() dto: NecesidadesDto) {
    return this.servicio.guardarSeccion(ref, 'necesidades', dto);
  }

  @Put('hogares/:ref/atencion')
  atencion(@Ref() ref: string, @Body() dto: AtencionDto) {
    return this.servicio.guardarSeccion(ref, 'atencion', dto);
  }

  /** Cierra la ficha; si falta algo responde 400 con la lista. */
  @Post('hogares/:ref/completar')
  @HttpCode(HttpStatus.OK)
  completar(@Ref() ref: string) {
    return this.servicio.completar(ref);
  }
}
