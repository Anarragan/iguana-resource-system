import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { LimitadorVentana } from './limitador-ventana.js';

/** Tope de peticiones por IP y minuto (RATE_LIMIT_PER_MIN, 240 por defecto): frena abusos y scripts. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limitador: LimitadorVentana;

  constructor(config: ConfigService) {
    this.limitador = new LimitadorVentana(Number(config.get('RATE_LIMIT_PER_MIN') ?? 240), 60_000);
  }

  canActivate(contexto: ExecutionContext): boolean {
    const req = contexto.switchToHttp().getRequest<Request>();
    if (!this.limitador.consumir(req.ip ?? 'desconocida')) {
      throw new HttpException('Demasiadas peticiones, espera un momento', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
