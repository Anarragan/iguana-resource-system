import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // El front corre en otro origen; CORS_ORIGIN admite varios separados por coma.
  const origenes = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origenes ?? true });

  // Es mejor usar configService aquí también, pero process.env sirve si el modulo global ya leyó el .env
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  
  // Agrega un log aquí para saber que el servidor realmente encendió
  console.log(`Aplicación corriendo en el puerto: ${port}`);
}

// Llama a la función de manera estándar, atrapando posibles errores de inicialización
bootstrap().catch(err => {
  console.error('Error crítico durante el bootstrap de la app:', err);
});
