import { LimitadorVentana } from './limitador-ventana.js';

describe('LimitadorVentana', () => {
  it('deja pasar hasta el máximo y luego bloquea', () => {
    const l = new LimitadorVentana(2, 1000);
    expect(l.consumir('ip', 0)).toBe(true);
    expect(l.consumir('ip', 1)).toBe(true);
    expect(l.consumir('ip', 2)).toBe(false);
  });

  it('cuenta cada clave por separado', () => {
    const l = new LimitadorVentana(1, 1000);
    expect(l.consumir('a', 0)).toBe(true);
    expect(l.consumir('b', 0)).toBe(true);
  });

  it('reinicia al terminar la ventana', () => {
    const l = new LimitadorVentana(1, 1000);
    l.consumir('ip', 0);
    expect(l.agotado('ip', 999)).toBe(true);
    expect(l.agotado('ip', 1000)).toBe(false);
  });
});
