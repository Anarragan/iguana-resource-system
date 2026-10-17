import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { LimitadorVentana } from './limitador-ventana.js';
import { ES_PUBLICA } from './publica.js';
import type { PeticionAutenticada, Usuario } from './usuario.js';

const TTL_MS = 60_000; // un usuario deshabilitado en Supabase deja de entrar en máximo este tiempo
const huella = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Toda la API exige `Authorization: Bearer <token de Supabase Auth>`. No se guarda ningún secreto:
 * se le pregunta a Supabase (/auth/v1/user) si el token es válido y quién es. Cualquier persona registrada
 * con correo confirmado puede usar el formulario; cada una solo ve sus propios hogares.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly url: string;
  private readonly anonKey: string;
  private readonly cache = new Map<string, { usuario: Usuario; hasta: number }>();
  private readonly fallos = new LimitadorVentana(20, 60_000);

  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.url = config.getOrThrow<string>('SUPABASE_URL').replace(/\/+$/, '');
    this.anonKey = config.getOrThrow<string>('SUPABASE_ANON_KEY');
  }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICA, [contexto.getHandler(), contexto.getClass()])) return true;

    const req = contexto.switchToHttp().getRequest<PeticionAutenticada>();
    const ip = req.ip ?? 'desconocida';
    if (this.fallos.agotado(ip)) throw new HttpException('Demasiados intentos fallidos', HttpStatus.TOO_MANY_REQUESTS);

    const token = /^Bearer (\S+)$/.exec(req.header('authorization') ?? '')?.[1];
    const usuario = token ? await this.resolver(token) : null;
    if (!usuario) {
      this.fallos.registrar(ip);
      throw new UnauthorizedException('Sesión inválida o vencida: inicia sesión de nuevo');
    }
    req.usuario = usuario;
    return true;
  }

  /** null si el token no vale o el correo no está confirmado. */
  private async resolver(token: string): Promise<Usuario | null> {
    const clave = huella(token);
    const ahora = Date.now();
    const guardado = this.cache.get(clave);
    if (guardado && guardado.hasta > ahora) return guardado.usuario;

    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.url}/auth/v1/user`, {
        headers: { apikey: this.anonKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      this.logger.error(`No se pudo contactar a Supabase Auth: ${(error as Error).message}`);
      throw new ServiceUnavailableException('No se pudo verificar la sesión, intenta de nuevo');
    }
    if (respuesta.status === 401 || respuesta.status === 403) return null;
    if (!respuesta.ok) {
      this.logger.error(`Supabase Auth respondió ${respuesta.status}`);
      throw new ServiceUnavailableException('No se pudo verificar la sesión, intenta de nuevo');
    }

    const datos = (await respuesta.json()) as { id?: string; email?: string; email_confirmed_at?: string | null };
    if (!datos.id || !datos.email || !datos.email_confirmed_at) return null;

    const usuario: Usuario = { id: datos.id, email: datos.email.toLowerCase() };
    if (this.cache.size >= 1_000) for (const [k, v] of this.cache) if (v.hasta <= ahora) this.cache.delete(k);
    this.cache.set(clave, { usuario, hasta: ahora + TTL_MS });
    return usuario;
  }
}
