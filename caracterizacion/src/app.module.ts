import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfigModule } from './database/db.config.js';
import { CaracterizacionModule } from './caracterizacion/caracterizacion.module.js';

export const { ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseConfigModule,
    CaracterizacionModule,
  ],
})
export class AppModule {}