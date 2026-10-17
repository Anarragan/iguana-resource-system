import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaracterizacionService } from './caracterizacion.service.js';
import { CaracterizacionController } from './caracterizacion.controller.js';
import { Hogar, Vivienda, Voluntario } from '../domain/entities/hogar.js';
import { Ficha } from '../domain/entities/ficha.js';
import {
  Actor,
  CategoriaDano,
  GrupoIntegrantes,
  GrupoNecesidad,
  ItemNecesidad,
  TipoAyuda,
} from '../domain/entities/catalogo.js';
import {
  Atencion,
  Dano,
  Escolaridad,
  Grupo,
  Menor,
  Respondente,
  Situacion,
  Visitante,
} from '../domain/entities/secciones.js';
import { Necesidad } from '../domain/entities/necesidad.js';
import { EntregaAyuda } from '../domain/entities/entrega_ayuda.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GrupoIntegrantes, CategoriaDano, GrupoNecesidad, ItemNecesidad, Actor, TipoAyuda,
      Vivienda, Hogar, Voluntario, Ficha,
      Respondente, Escolaridad, Situacion, Atencion,
      Menor, Grupo, Dano, Necesidad, Visitante, EntregaAyuda,
    ]),
  ],
  controllers: [CaracterizacionController],
  providers: [CaracterizacionService],
})
export class CaracterizacionModule {}
