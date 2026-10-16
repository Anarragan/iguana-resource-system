import { registerDecorator, type ValidationOptions } from 'class-validator';

/** La fecha (YYYY-MM-DD) no puede ser posterior a hoy; coincide con el CHECK de la base. */
export function IsNotFutureDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} no puede ser una fecha futura`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          !Number.isNaN(Date.parse(value)) &&
          value.slice(0, 10) <= new Date().toISOString().slice(0, 10),
      },
    });
}
