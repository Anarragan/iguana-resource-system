import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { cabecerasSeguras } from './seguridad/cabeceras.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  // Detrás del proxy de la plataforma (Railway): así req.ip es la del cliente y el límite de peticiones funciona.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cabecerasSeguras);
  app.useBodyParser('json', { limit: '100kb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // El front corre en otro origen; CORS_ORIGIN admite varios separados por coma.
  // En producción, sin CORS_ORIGIN no se acepta ningún origen (en desarrollo, todos).
  const origenes = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  if (!origenes?.length && process.env.NODE_ENV === 'production') {
    new Logger('Bootstrap').warn('CORS_ORIGIN no está definido: se rechazan las peticiones de otros orígenes');
  }
  app.enableCors({
    origin: origenes?.length ? origenes : process.env.NODE_ENV !== 'production',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Aplicación corriendo en el puerto: ${port}`);
}

bootstrap().catch((err) => {
  console.error('Error crítico durante el bootstrap de la app:', err);
  process.exit(1);
});
