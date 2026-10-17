import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfigModule } from './database/db.config.js';
import { CaracterizacionModule } from './caracterizacion/caracterizacion.module.js';
import { ApiKeyGuard } from './seguridad/api-key.guard.js';
import { RateLimitGuard } from './seguridad/rate-limit.guard.js';

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
  providers: [
    // Orden: primero el tope de peticiones, luego la clave de API. Aplican a TODA la API.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
