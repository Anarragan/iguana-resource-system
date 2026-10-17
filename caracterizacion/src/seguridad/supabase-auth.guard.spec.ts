import { HttpException, ServiceUnavailableException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import type { PeticionAutenticada } from './usuario.js';

const config = { getOrThrow: (k: string) => (k === 'SUPABASE_URL' ? 'https://x.supabase.co/' : 'anon-key') } as unknown as ConfigService;
const reflector = (publica = false) => ({ getAllAndOverride: () => publica }) as unknown as Reflector;

const peticion = (authorization?: string, ip = '1.1.1.1') => ({ ip, header: () => authorization }) as unknown as PeticionAutenticada;
const contexto = (req: PeticionAutenticada) =>
  ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

const supabase = (estado: number, cuerpo: object = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }));
const usuarioOk = (confirmado = true) => ({ id: 'u1', email: 'Ana@Correo.com', email_confirmed_at: confirmado ? '2026-10-01T00:00:00Z' : null });

afterEach(() => vi.restoreAllMocks());

describe('SupabaseAuthGuard', () => {
  it('deja pasar los endpoints públicos sin token ni llamada a Supabase', async () => {
    const espia = supabase(200);
    expect(await new SupabaseAuthGuard(config, reflector(true)).canActivate(contexto(peticion()))).toBe(true);
    expect(espia).not.toHaveBeenCalled();
  });

  it('rechaza peticiones sin cabecera Bearer', async () => {
    const guard = new SupabaseAuthGuard(config, reflector());
    await expect(guard.canActivate(contexto(peticion()))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contexto(peticion('Basic abc')))).rejects.toThrow(UnauthorizedException);
  });

  it('acepta un token válido y deja el usuario (email en minúsculas) en la petición', async () => {
    const espia = supabase(200, usuarioOk());
    const req = peticion('Bearer tok');
    expect(await new SupabaseAuthGuard(config, reflector()).canActivate(contexto(req))).toBe(true);
    expect(req.usuario).toEqual({ id: 'u1', email: 'ana@correo.com' });
    expect(espia.mock.calls[0][0]).toBe('https://x.supabase.co/auth/v1/user');
  });

  it('rechaza (401) un token que Supabase no reconoce', async () => {
    supabase(401);
    await expect(new SupabaseAuthGuard(config, reflector()).canActivate(contexto(peticion('Bearer malo')))).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) un correo sin confirmar', async () => {
    supabase(200, usuarioOk(false));
    await expect(new SupabaseAuthGuard(config, reflector()).canActivate(contexto(peticion('Bearer sin-confirmar')))).rejects.toThrow(UnauthorizedException);
  });

  it('responde 503 si Supabase no responde, sin tratarlo como credencial inválida', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'));
    await expect(new SupabaseAuthGuard(config, reflector()).canActivate(contexto(peticion('Bearer tok')))).rejects.toThrow(ServiceUnavailableException);
  });

  it('guarda en memoria la verificación para no llamar a Supabase en cada petición', async () => {
    const espia = supabase(200, usuarioOk());
    const guard = new SupabaseAuthGuard(config, reflector());
    await guard.canActivate(contexto(peticion('Bearer tok')));
    await guard.canActivate(contexto(peticion('Bearer tok')));
    expect(espia).toHaveBeenCalledTimes(1);
  });

  it('bloquea con 429 a una IP tras 20 sesiones inválidas', async () => {
    supabase(401);
    const guard = new SupabaseAuthGuard(config, reflector());
    for (let i = 0; i < 20; i++) await expect(guard.canActivate(contexto(peticion(`Bearer m${i}`, '9.9.9.9')))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contexto(peticion('Bearer otro', '9.9.9.9')))).rejects.toThrow(HttpException);
  });
});
