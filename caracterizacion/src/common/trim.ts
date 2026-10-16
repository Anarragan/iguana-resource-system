import { Transform } from 'class-transformer';

/** Quita espacios al inicio y al final de los strings. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
