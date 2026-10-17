import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Quien hace la petición, ya verificado contra Supabase Auth. `email` es lo que queda como "aplicada por". */
export interface Usuario {
  id: string;
  email: string;
}

export type PeticionAutenticada = Request & { usuario?: Usuario };

/** `@Usuario()` en un parámetro del controlador entrega el usuario autenticado. */
export const UsuarioActual = createParamDecorator(
  (_: unknown, contexto: ExecutionContext) => contexto.switchToHttp().getRequest<PeticionAutenticada>().usuario as Usuario,
);
