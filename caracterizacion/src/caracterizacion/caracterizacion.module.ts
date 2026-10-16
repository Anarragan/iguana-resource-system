import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaracterizacionService } from './caracterizacion.service.js';
import { CaracterizacionController } from './caracterizacion.controller.js';
import { Hogar } from '../domain/entities/hogar.js';
import { Familia } from '../domain/entities/familia.js';
import { Persona } from '../domain/entities/persona.js';
import { Afectacion } from '../domain/entities/afectacion.js';
import { Necesidad } from '../domain/entities/necesidad.js';
import { EntregaAyuda } from '../domain/entities/entrega_ayuda.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hogar, Familia, Persona, Afectacion, Necesidad, EntregaAyuda]),
  ],
  controllers: [CaracterizacionController],
  providers: [CaracterizacionService],
})
export class CaracterizacionModule {}
