import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICA = 'esPublica';

/** Marca un endpoint que no exige clave de API (solo el chequeo de salud). */
export const Public = () => SetMetadata(ES_PUBLICA, true);
