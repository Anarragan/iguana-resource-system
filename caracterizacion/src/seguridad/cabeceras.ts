import type { NextFunction, Request, Response } from 'express';

/**
 * Cabeceras de seguridad para una API JSON. `no-store` evita que navegadores o proxies guarden respuestas
 * en dispositivos compartidos de los voluntarios.
 */
export function cabecerasSeguras(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
}
