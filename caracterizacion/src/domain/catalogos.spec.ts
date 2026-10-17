import { readFileSync } from 'node:fs';
import { CATALOGOS, CATEGORIAS_DANO, GRUPOS_INTEGRANTES, OPCIONES } from './catalogos.js';
import { ITEMS_NECESIDAD } from './enums.js';
import { SECCIONES, snake } from '../caracterizacion/secciones.js';

// Evita que el front/DTOs y la base se desalineen: todo código y columna que usa la API debe existir en el SQL.
const sql = readFileSync(new URL('../../db/migrations/004_esquema_compacto.sql', import.meta.url), 'utf8');

/** Texto de un CREATE TABLE; el ")" que lo cierra va solo en su línea. */
const cuerpoDe = (tabla: string) => {
  const inicio = sql.indexOf(`CREATE TABLE ${tabla} (`);
  const cierre = [...sql.matchAll(/^\);/gm)].map((m) => m.index).find((i) => i > inicio) ?? sql.length;
  return sql.slice(inicio, cierre);
};

describe('catálogos vs esquema SQL', () => {
  it('cada código de opción aparece en un CHECK de la migración', () => {
    const faltan = Object.values(OPCIONES).flat().map((o) => o.codigo).filter((c) => !sql.includes(`'${c}'`));
    expect(faltan).toEqual([]);
  });

  it('cada ítem de necesidad aparece en el CHECK de necesidades', () => {
    expect(ITEMS_NECESIDAD.filter((c) => !sql.includes(`'${c}'`))).toEqual([]);
    expect(new Set(ITEMS_NECESIDAD).size).toBe(ITEMS_NECESIDAD.length);
  });

  it('cada campo de las secciones es una columna de su tabla', () => {
    for (const { tabla, campos } of Object.values(SECCIONES)) {
      const cuerpo = cuerpoDe(tabla);
      const faltan = campos.map(snake).filter((c) => !new RegExp(String.raw`^\s+${c}\s`, 'm').test(cuerpo));
      expect(faltan, tabla).toEqual([]);
    }
  });

  it('daños y grupos del catálogo coinciden con campos de las secciones', () => {
    expect(CATEGORIAS_DANO.map((d) => d.campo).every((c) => (SECCIONES.vivienda.campos as readonly string[]).includes(c))).toBe(true);
    expect(GRUPOS_INTEGRANTES.map((g) => g.campo).every((c) => (SECCIONES.composicion.campos as readonly string[]).includes(c))).toBe(true);
    expect(CATALOGOS.categoriasDano).toHaveLength(8);
  });
});
