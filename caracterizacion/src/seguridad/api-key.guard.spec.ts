import { HttpException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard.js';

const CLAVE = 'clave-de-prueba-0123456789abcdef';
const OTRA = 'otra-clave-de-prueba-9876543210zz';

const config = (api_keys?: string) => ({ getOrThrow: () => api_keys ?? '' }) as unknown as ConfigService;
const reflector = (publica = false) => ({ getAllAndOverride: () => publica }) as unknown as Reflector;
const contexto = (clave?: string, ip = '1.1.1.1') =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ ip, header: () => clave }) }),
  }) as unknown as ExecutionContext;

describe('ApiKeyGuard', () => {
  it('rechaza arrancar sin claves o con claves cortas', () => {
    expect(() => new ApiKeyGuard(config(''), reflector())).toThrow();
    expect(() => new ApiKeyGuard(config('corta'), reflector())).toThrow();
  });

  it('acepta cualquiera de las claves configuradas (rotación)', () => {
    const guard = new ApiKeyGuard(config(`${CLAVE}, ${OTRA}`), reflector());
    expect(guard.canActivate(contexto(CLAVE))).toBe(true);
    expect(guard.canActivate(contexto(OTRA))).toBe(true);
  });

  it('rechaza clave ausente o incorrecta', () => {
    const guard = new ApiKeyGuard(config(CLAVE), reflector());
    expect(() => guard.canActivate(contexto(undefined))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contexto('x'.repeat(32)))).toThrow(UnauthorizedException);
  });

  it('deja pasar los endpoints públicos sin clave', () => {
    const guard = new ApiKeyGuard(config(CLAVE), reflector(true));
    expect(guard.canActivate(contexto(undefined))).toBe(true);
  });

  it('bloquea con 429 a una IP tras 10 fallos, aunque luego mande la clave buena', () => {
    const guard = new ApiKeyGuard(config(CLAVE), reflector());
    for (let i = 0; i < 10; i++) expect(() => guard.canActivate(contexto('mala', '9.9.9.9'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contexto(CLAVE, '9.9.9.9'))).toThrow(HttpException);
    expect(guard.canActivate(contexto(CLAVE, '8.8.8.8'))).toBe(true);
  });
});
