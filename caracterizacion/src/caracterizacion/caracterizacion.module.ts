import { Module } from '@nestjs/common';
import { CaracterizacionService } from './caracterizacion.service.js';
import { CaracterizacionController } from './caracterizacion.controller.js';

// Sin entidades TypeORM: la API escribe con SQL parametrizado y lee solo la vista v_progreso_hogar.
@Module({
  controllers: [CaracterizacionController],
  providers: [CaracterizacionService],
})
export class CaracterizacionModule {}
