import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Hogar, Vivienda, Voluntario } from '../domain/entities/hogar.js';
import { Ficha } from '../domain/entities/ficha.js';
import {
  Actor,
  CategoriaDano,
  GrupoIntegrantes,
  GrupoNecesidad,
  ItemNecesidad,
  TipoAyuda,
} from '../domain/entities/catalogo.js';
import {
  Atencion,
  Dano,
  Escolaridad,
  Grupo,
  Menor,
  Respondente,
  Situacion,
  Visitante,
} from '../domain/entities/secciones.js';
import { Necesidad } from '../domain/entities/necesidad.js';
import { EntregaAyuda } from '../domain/entities/entrega_ayuda.js';
import type { Id } from '../domain/enums.ts';
import {
  AtencionDto,
  CrearFichaDto,
  DanosDto,
  GruposDto,
  NecesidadesDto,
  VisitantesDto,
} from './dto/crear-caracterizacion.dto.js';

const SECTOR = 'La Iguaná';
const SIN_AUTORIZACION = 'Sin autorización';
const PREFIJO_HOGAR = 'IG';

/** Violaciones de FK (23503), UNIQUE (23505) y CHECK (23514): el dato es inválido, no el servidor. */
const REGLAS_BD = ['23503', '23505', '23514'];

type Clase<T> = new () => T;
type Fila = Record<string, unknown>;

@Injectable()
export class CaracterizacionService {
  private readonly logger = new Logger(CaracterizacionService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Las 6 listas del formulario, ya ordenadas. */
  async catalogos() {
    const m = this.dataSource.manager;
    const [gruposIntegrantes, categoriasDano, gruposNecesidad, itemsNecesidad, actores, tiposAyuda] =
      await Promise.all([
        m.find(GrupoIntegrantes, { order: { orden: 'ASC' } }),
        m.find(CategoriaDano, { order: { orden: 'ASC' } }),
        m.find(GrupoNecesidad, { order: { orden: 'ASC' } }),
        m.find(ItemNecesidad, { order: { grupo: 'ASC', orden: 'ASC' } }),
        m.find(Actor, { order: { codigo: 'ASC' } }),
        m.find(TipoAyuda, { order: { codigo: 'ASC' } }),
      ]);
    return { gruposIntegrantes, categoriasDano, gruposNecesidad, itemsNecesidad, actores, tiposAyuda };
  }

  async listar(limite: number, desde: number) {
    return this.dataSource.query(
      `SELECT f.id_ficha AS "idFicha", f.estado, f.fecha_aplicacion AS "fechaAplicacion",
              h.id_hogar AS "idHogar", h.codigo_hogar AS "codigoHogar", h.nombre_referencia AS "nombreReferencia",
              v.direccion, r.ninos, r.adultos_mayores AS "adultosMayores", r.num_personas AS "numPersonas",
              r.total_dano AS "totalDano"
         FROM ficha f
         JOIN hogar h ON h.id_hogar = f.id_hogar
         JOIN vivienda v ON v.id_vivienda = h.id_vivienda
         JOIN v_ficha_resumen r ON r.id_ficha = f.id_ficha
        ORDER BY f.id_ficha DESC LIMIT $1 OFFSET $2`,
      [limite, desde],
    );
  }

  /** Ejecuta en transacción y traduce las reglas de la base a 400. */
  private async tx<T>(fn: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(fn);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const driver = (error as { driverError?: { code?: string; constraint?: string } }).driverError;
      if (driver?.code && REGLAS_BD.includes(driver.code)) {
        throw new BadRequestException(`Dato inválido (${driver.constraint ?? driver.code})`);
      }
      this.logger.error('Error al guardar la ficha', error);
      throw new InternalServerErrorException('No fue posible guardar la ficha');
    }
  }

  /** Crea hogar (si hace falta) y ficha. Sin autorización la ficha nace 'sin_autorizacion' y no guarda datos personales. */
  crear(dto: CrearFichaDto) {
    const autoriza = dto.autorizaTratamiento;
    if (autoriza && !dto.idHogar && !(dto.vivienda && dto.hogar)) {
      throw new BadRequestException('Con autorización se requiere idHogar o vivienda y hogar');
    }
    return this.tx(async (m) => {
      let idHogar = dto.idHogar;
      if (idHogar) {
        if (!(await m.existsBy(Hogar, { idHogar }))) throw new NotFoundException(`No existe el hogar ${idHogar}`);
      } else {
        const vivienda = await m.save(
          m.create(Vivienda, {
            direccion: autoriza ? dto.vivienda!.direccion : SIN_AUTORIZACION,
            interior: (autoriza && dto.vivienda?.interior) || null,
            callejon: (autoriza && dto.vivienda?.callejon) || null,
            sector: SECTOR,
            materialParedes: (autoriza && dto.vivienda?.materialParedes) || null,
            nivelAguaMax: (autoriza && dto.vivienda?.nivelAguaMax) || null,
            inundadaAntes: (autoriza && dto.vivienda?.inundadaAntes) || undefined,
          }),
        );
        // El código sale del id que asigna la base: se inserta con uno temporal único y se corrige en la misma transacción.
        const hogar = await m.save(
          m.create(Hogar, {
            codigoHogar: `TMP${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`,
            idVivienda: vivienda.idVivienda,
            nombreReferencia: autoriza ? dto.hogar!.nombreReferencia : SIN_AUTORIZACION,
            telefonoContacto: (autoriza && dto.hogar?.telefonoContacto) || null,
          }),
        );
        idHogar = hogar.idHogar;
        await m.update(Hogar, { idHogar }, { codigoHogar: `${PREFIJO_HOGAR}-${String(idHogar).padStart(4, '0')}` });
      }

      const voluntario =
        (await m.findOneBy(Voluntario, { nombre: dto.voluntario })) ??
        (await m.save(m.create(Voluntario, { nombre: dto.voluntario })));

      const ficha = await m.save(
        m.create(Ficha, {
          idHogar,
          idVoluntario: voluntario.idVoluntario,
          fechaAplicacion: dto.fechaAplicacion,
          estado: autoriza ? 'borrador' : 'sin_autorizacion',
          autorizaTratamiento: autoriza,
          autorizaSeguimiento: autoriza && (dto.autorizaSeguimiento ?? false),
          versionConsentimiento: dto.versionConsentimiento,
          observaciones: (autoriza && dto.observaciones) || null,
        }),
      );
      return { idFicha: ficha.idFicha, idHogar, estado: ficha.estado };
    });
  }

  /** Paso con una sola fila (respondente, escolaridad, situación). */
  guardarUno<T extends { idFicha: Id }>(id: number, entidad: Clase<T>, dto: object) {
    return this.editar(id, (m) => this.reemplazar(m, entidad, id, [dto]));
  }

  guardarAtencion(id: number, { ayudasRecibidas, ...dto }: AtencionDto) {
    return this.editar(id, async (m) => {
      await this.reemplazar(m, Atencion, id, [dto]);
      const { idHogar } = await m.findOneByOrFail(Ficha, { idFicha: id });
      await m.delete(EntregaAyuda, { idFicha: id, estado: 'reportada' });
      await this.reemplazar(
        m,
        EntregaAyuda,
        id,
        (ayudasRecibidas ?? []).map((tipoAyuda) => ({ idHogar, tipoAyuda, estado: 'reportada' })),
        false,
      );
    });
  }

  guardarDanos(id: number, { danos }: DanosDto) {
    return this.editar(id, async (m) => {
      // Siempre las filas de todas las categorías del catálogo, cada una una vez.
      const esperadas = (await m.find(CategoriaDano)).map((c) => c.codigo).sort();
      const recibidas = danos.map((d) => d.categoria).sort();
      if (esperadas.join() !== recibidas.join()) {
        throw new BadRequestException(`danos debe traer exactamente una vez: ${esperadas.join(', ')}`);
      }
      await this.reemplazar(m, Dano, id, danos);
    });
  }

  guardarNecesidades(id: number, { necesidades }: NecesidadesDto) {
    return this.editar(id, async (m) => {
      if (necesidades.some((n) => n.item === 'otro_condicion_especial' && !n.detalle)) {
        throw new BadRequestException("'otro_condicion_especial' requiere detalle");
      }
      await this.reemplazar(m, Necesidad, id, necesidades);
    });
  }

  guardarVisitantes(id: number, { visitantes }: VisitantesDto) {
    return this.editar(id, async (m) => {
      if (visitantes.some((v) => v.actor === 'nadie') && visitantes.length > 1) {
        throw new BadRequestException("'nadie' excluye a los demás visitantes");
      }
      await this.reemplazar(m, Visitante, id, visitantes);
    });
  }

  guardarGrupos(id: number, { numPersonas, menores, grupos }: GruposDto) {
    return this.editar(id, async (m) => {
      await m.update(Ficha, { idFicha: id }, { numPersonas });
      await this.reemplazar(m, Menor, id, menores.map((edad) => ({ edad })));
      await this.reemplazar(m, Grupo, id, grupos);
    });
  }

  /** Valida lo que la base no puede (reglas entre tablas) y pasa la ficha a 'completa'. */
  completar(id: number) {
    return this.tx(async (m) => {
      const ficha = await this.borrador(m, id);
      const [respondente, situacion, menores, grupos, danos, categorias] = await Promise.all([
        m.countBy(Respondente, { idFicha: id }),
        m.findOneBy(Situacion, { idFicha: id }),
        m.countBy(Menor, { idFicha: id }),
        m.findBy(Grupo, { idFicha: id }),
        m.countBy(Dano, { idFicha: id }),
        m.count(CategoriaDano),
      ]);
      const errores: string[] = [];
      if (ficha.numPersonas == null) errores.push('falta numPersonas');
      if (!respondente) errores.push('falta el respondente');
      if (!situacion?.lugarPernocta) errores.push('falta dónde pernoctó la familia (situacion.lugarPernocta)');
      if (danos !== categorias) errores.push(`danos debe tener las ${categorias} categorías`);
      if (ficha.numPersonas != null) {
        if (menores > ficha.numPersonas) errores.push('los menores superan numPersonas');
        for (const g of grupos) {
          if (g.cantidad > ficha.numPersonas) errores.push(`${g.grupo} supera numPersonas`);
        }
      }
      if (errores.length) throw new BadRequestException(errores);

      await m.update(Ficha, { idFicha: id }, { estado: 'completa', updatedAt: new Date() });
      return { idFicha: id, estado: 'completa' };
    });
  }

  async obtener(id: number) {
    const m = this.dataSource.manager;
    const ficha = await m.findOne(Ficha, {
      where: { idFicha: id },
      relations: { hogar: { vivienda: true }, voluntario: true },
    });
    if (!ficha) throw new NotFoundException(`No existe la ficha ${id}`);

    const por = { idFicha: id };
    const [respondente, escolaridad, situacion, atencion, menores, grupos, danos, necesidades, visitantes, ayudas, resumen, seguimiento] =
      await Promise.all([
        m.findOneBy(Respondente, por),
        m.findOneBy(Escolaridad, por),
        m.findOneBy(Situacion, por),
        m.findOneBy(Atencion, por),
        m.find(Menor, { where: por, order: { idMenor: 'ASC' } }),
        m.findBy(Grupo, por),
        m.findBy(Dano, por),
        m.find(Necesidad, { where: por, order: { idNecesidad: 'ASC' } }),
        m.findBy(Visitante, por),
        m.findBy(EntregaAyuda, por),
        this.dataSource.query(
          `SELECT num_personas AS "numPersonas", ninos, adultos_mayores AS "adultosMayores", total_dano AS "totalDano"
             FROM v_ficha_resumen WHERE id_ficha = $1`,
          [id],
        ),
        this.dataSource.query(
          `SELECT duerme_en_riesgo AS "duermeEnRiesgo", urgente_salud AS "urgenteSalud",
                  urgente_agua_alimento AS "urgenteAguaAlimento", electrica_riesgo AS "electricaRiesgo",
                  (duerme_en_riesgo OR urgente_salud OR urgente_agua_alimento OR electrica_riesgo) AS "requiereSeguimiento"
             FROM v_seguimiento_urgente WHERE id_ficha = $1`,
          [id],
        ),
      ]);

    const { hogar, voluntario, ...cabecera } = ficha;
    const { vivienda, ...datosHogar } = hogar!;
    return {
      ...cabecera,
      voluntario: voluntario?.nombre,
      hogar: { ...datosHogar, vivienda },
      respondente,
      escolaridad,
      situacion,
      atencion,
      menores: menores.map((x) => x.edad),
      grupos,
      danos,
      necesidades,
      visitantes,
      ayudasRecibidas: ayudas,
      resumen: resumen[0],
      seguimiento: seguimiento[0] ?? null, // solo existe para fichas completas
    };
  }

  // ---------- helpers ----------
  /** La ficha debe existir y seguir en borrador; si no, 404 / 409. */
  private async borrador(m: EntityManager, id: number): Promise<Ficha> {
    const ficha = await m.findOneBy(Ficha, { idFicha: id });
    if (!ficha) throw new NotFoundException(`No existe la ficha ${id}`);
    if (ficha.estado !== 'borrador') throw new ConflictException(`La ficha está '${ficha.estado}' y no se puede modificar`);
    return ficha;
  }

  private editar(id: number, fn: (m: EntityManager) => Promise<unknown>) {
    return this.tx(async (m) => {
      await this.borrador(m, id);
      await fn(m);
      await m.update(Ficha, { idFicha: id }, { updatedAt: new Date() });
      return { idFicha: id, guardado: true };
    });
  }

  /** Quita null/undefined para que la base ponga el valor por defecto en las columnas esenciales. */
  private sinNulos(fila: object): Fila {
    return Object.fromEntries(Object.entries(fila).filter(([, v]) => v != null));
  }

  /** Borra lo guardado de la ficha en esa tabla e inserta las filas nuevas (cada paso se guarda completo). */
  private async reemplazar<T>(m: EntityManager, entidad: Clase<T>, idFicha: number, filas: object[], borrar = true) {
    if (borrar) await m.delete(entidad as never, { idFicha });
    if (filas.length) await m.insert(entidad as never, filas.map((f) => ({ ...this.sinNulos(f), idFicha })) as Fila[]);
  }
}

