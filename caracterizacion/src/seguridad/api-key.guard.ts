import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { LimitadorVentana } from './limitador-ventana.js';
import { ES_PUBLICA } from './publica.js';

const huella = (clave: string) => createHash('sha256').update(clave).digest();
const MIN_LARGO_CLAVE = 24;

/**
 * Toda la API exige la cabecera `x-api-key`. `API_KEYS` admite varias claves separadas por coma
 * para rotar sin cortar el servicio (se agrega la nueva, se actualizan los dispositivos, se quita la vieja).
 * Se compara el hash en tiempo constante y se frena a quien falla muchas veces.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly huellas: Buffer[];
  private readonly fallos = new LimitadorVentana(10, 60_000);

  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const claves = config.getOrThrow<string>('API_KEYS').split(',').map((k) => k.trim()).filter(Boolean);
    if (!claves.length || claves.some((k) => k.length < MIN_LARGO_CLAVE)) {
      throw new Error(`API_KEYS debe tener al menos una clave y cada una de ${MIN_LARGO_CLAVE}+ caracteres`);
    }
    this.huellas = claves.map(huella);
  }

  canActivate(contexto: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICA, [contexto.getHandler(), contexto.getClass()])) return true;

    const req = contexto.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? 'desconocida';
    if (this.fallos.agotado(ip)) throw new HttpException('Demasiados intentos fallidos', HttpStatus.TOO_MANY_REQUESTS);

    const dada = req.header('x-api-key');
    const huellaDada = typeof dada === 'string' ? huella(dada) : null;
    // Se comparan todas (sin cortar en la primera) para no filtrar cuál coincidió por el tiempo de respuesta.
    const coincidencias = this.huellas.map((h) => huellaDada !== null && timingSafeEqual(h, huellaDada));
    if (!coincidencias.includes(true)) {
      this.fallos.registrar(ip);
      throw new UnauthorizedException('Clave de API inválida o ausente');
    }
    return true;
  }
}
