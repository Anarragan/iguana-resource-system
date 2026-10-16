import type { ValueTransformer } from 'typeorm';

// pg devuelve bigint/numeric como string; el dominio usa number.
export const idTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
