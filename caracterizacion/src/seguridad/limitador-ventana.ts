/** Contador por clave en ventanas fijas, en memoria (una sola instancia de la API). */
export class LimitadorVentana {
  private readonly cubos = new Map<string, { n: number; hasta: number }>();

  constructor(
    private readonly max: number,
    private readonly ventanaMs: number,
  ) {}

  private cubo(clave: string, ahora: number) {
    let c = this.cubos.get(clave);
    if (!c || c.hasta <= ahora) {
      if (this.cubos.size >= 10_000) this.limpiar(ahora);
      c = { n: 0, hasta: ahora + this.ventanaMs };
      this.cubos.set(clave, c);
    }
    return c;
  }

  private limpiar(ahora: number) {
    for (const [clave, c] of this.cubos) if (c.hasta <= ahora) this.cubos.delete(clave);
  }

  /** ¿Ya se gastó el cupo de esta ventana? */
  agotado(clave: string, ahora = Date.now()) {
    return this.cubo(clave, ahora).n >= this.max;
  }

  registrar(clave: string, ahora = Date.now()) {
    this.cubo(clave, ahora).n++;
  }

  /** Cuenta un intento; devuelve false si ya no cabe. */
  consumir(clave: string, ahora = Date.now()) {
    if (this.agotado(clave, ahora)) return false;
    this.registrar(clave, ahora);
    return true;
  }
}
