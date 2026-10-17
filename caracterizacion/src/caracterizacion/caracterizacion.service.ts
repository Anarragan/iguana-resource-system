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
import { CATALOGOS } from '../domain/catalogos.js';
import type { Usuario } from '../seguridad/usuario.js';
import { ContactoDto, CrearHogarDto, ListarHogaresDto } from './dto/hogar.dto.js';
import { SECCIONES, snake, type Seccion } from './secciones.js';

/** Código con el que la base avisa "falta algo para completar" (db/migrations/004, validar_hogar_completo). */
const FALTA_PARA_COMPLETAR = 'IG001';

/** Reglas de la base (CHECK) en palabras de voluntario. Los nombres vienen de db/migrations/004. */
const REGLAS: Record<string, string> = {
  composicion_parentesco_chk: 'El parentesco solo aplica cuando quien responde NO es jefe/a de hogar',
  composicion_conteo_chk: 'Los niños y las personas adultas mayores suman más que las personas del hogar',
  composicion_grupos_max_chk: 'Algún grupo (discapacidad, embarazo, cuidados, cuidadores, sostenimiento) supera el número de personas del hogar',
  composicion_edades_chk: 'Las edades de niños, niñas y adolescentes deben estar entre 0 y 17',
  composicion_escolar_ninos_chk: 'La escolaridad solo aplica si hay niños, niñas o adolescentes',
  composicion_escolar_dias_chk: 'Los días sin asistir solo aplican si dejaron de asistir',
  composicion_manejo_otro_chk: 'El detalle del manejo de estudios solo aplica si eligió "Otro"',
  vivienda_alerta_otro_chk: 'El detalle del medio de alerta solo aplica si eligió "Otro"',
  vivienda_ingresos_otro_chk: 'El detalle de ingresos solo aplica si eligió "Otro"',
  necesidades_urgentes_chk: 'Lo más urgente son máximo 3 elementos, sin repetir y entre los que marcó',
  necesidades_otro_chk: 'El detalle de "otro elemento por condición especial" es obligatorio si lo marcó y no aplica si no',
  atencion_visitas_chk: '"Nadie" no se puede combinar con otras visitas',
  atencion_visitas_otro_chk: 'El detalle de la visita solo aplica si eligió "Otro"',
  atencion_censo_quien_chk: '"¿Quién hizo el censo?" solo aplica si hubo censo previo',
  atencion_oferta_chk: '"¿Aceptó la oferta?" solo aplica si recibió una oferta',
  atencion_ayudas_chk: '"Ninguna" no se puede combinar con otras ayudas',
  atencion_ayudas_otra_chk: 'El detalle de la ayuda solo aplica si eligió "Otra"',
};

type Fila = Record<string, unknown>;

/** El driver entrega las columnas `date` como Date a medianoche local: se devuelve el día tal cual, YYYY-MM-DD. */
const fechaISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Injectable()
export class CaracterizacionService {
  private readonly logger = new Logger(CaracterizacionService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  catalogos() {
    return CATALOGOS;
  }

  /** Avance de los hogares: códigos y pasos, nunca nombres, direcciones ni respuestas. */
  async listar({ estado, limite = 100, desde = 0 }: ListarHogaresDto, usuario: Usuario) {
    const filtros: string[] = [];
    const params: unknown[] = [];
    if (estado) filtros.push(`estado = $${params.push(estado)}`);
    filtros.push(`aplicada_por = $${params.push(usuario.email)}`); // cada voluntario ve solo lo suyo
    const donde = `WHERE ${filtros.join(' AND ')}`;
    const filas: Fila[] = await this.db.query(
      `SELECT * FROM v_progreso_hogar ${donde} ORDER BY updated_at DESC LIMIT $${params.push(limite)} OFFSET $${params.push(desde)}`,
      params,
    );
    return filas.map((f) => ({ ...this.cabecera(f), requiereSeguimiento: f.requiere_seguimiento }));
  }

  /** Crea el hogar en borrador (o 'sin_autorizacion', sin guardar ningún dato personal). */
  crear(dto: CrearHogarDto, usuario: Usuario) {
    const { autorizaTratamiento: autoriza } = dto;
    const personales = [dto.direccion, dto.interior, dto.callejon, dto.nombreReferencia, dto.telefonoContacto, dto.observaciones];
    if (!autoriza && personales.some(Boolean)) {
      throw new BadRequestException('Sin autorización no se pueden enviar datos personales');
    }
    if (!autoriza && dto.autorizaSeguimiento) {
      throw new BadRequestException('No se puede autorizar el seguimiento sin autorizar el tratamiento de datos');
    }

    return this.tx(usuario.email, async (m) => {
      const [hogar] = await m.query(
        `INSERT INTO hogar (sector, autoriza_tratamiento, autoriza_seguimiento, version_consentimiento,
                            fecha_aplicacion, aplicada_por, estado)
         VALUES ($1, $2, $3, $4, COALESCE($5::date, current_date), $6, $7)
         RETURNING id_hogar`,
        [
          dto.sector ?? null,
          autoriza,
          autoriza && (dto.autorizaSeguimiento ?? false),
          dto.versionConsentimiento,
          dto.fechaAplicacion ?? null,
          usuario.email,
          autoriza ? 'borrador' : 'sin_autorizacion',
        ],
      );
      if (autoriza) {
        await m.query(
          `INSERT INTO hogar_contacto (id_hogar, direccion, interior, callejon, nombre_referencia, telefono_contacto, observaciones)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [hogar.id_hogar, dto.direccion, dto.interior ?? null, dto.callejon ?? null, dto.nombreReferencia,
           dto.telefonoContacto ?? null, dto.observaciones ?? null],
        );
      }
      return this.progreso(m, hogar.id_hogar);
    });
  }

  /** Corrige los datos de contacto (la API puede escribirlos pero nunca leerlos). */
  guardarContacto(ref: string, dto: ContactoDto, usuario: Usuario) {
    return this.editar(ref, usuario, async (m, id) => {
      const [, filas] = await m.query(
        `UPDATE hogar_contacto
            SET direccion = $2, interior = $3, callejon = $4, nombre_referencia = $5, telefono_contacto = $6, observaciones = $7
          WHERE id_hogar = $1`,
        [id, dto.direccion, dto.interior ?? null, dto.callejon ?? null, dto.nombreReferencia,
         dto.telefonoContacto ?? null, dto.observaciones ?? null],
      );
      if (!filas) throw new ConflictException('Este hogar no tiene datos de contacto que corregir');
    });
  }

  /** Reemplaza completo un paso: lo que no se envía queda vacío (o en su valor por defecto). */
  guardarSeccion(ref: string, seccion: Seccion, dto: object, usuario: Usuario) {
    const { tabla, campos } = SECCIONES[seccion];
    const valores = dto as Fila;
    const enviados = campos.filter((c) => valores[c] != null);
    const columnas = enviados.map(snake);
    const sql = `INSERT INTO ${tabla} (id_hogar${columnas.map((c) => `, ${c}`).join('')})
                 VALUES ($1${columnas.map((_, i) => `, $${i + 2}`).join('')})
                 ON CONFLICT (id_hogar) DO UPDATE SET ${campos.map((c) => `${snake(c)} = EXCLUDED.${snake(c)}`).join(', ')}`;
    return this.editar(ref, usuario, (m, id) => m.query(sql, [id, ...enviados.map((c) => valores[c])]));
  }

  /** Cierra la ficha. La base decide si está completa y, si no, dice qué falta. */
  completar(ref: string, usuario: Usuario) {
    return this.editar(ref, usuario, (m, id) => m.query(`UPDATE hogar SET estado = 'completo' WHERE id_hogar = $1`, [id]));
  }

  async obtenerProgreso(ref: string, usuario: Usuario) {
    return this.tx(null, async (m) => {
      const [h] = await m.query(`SELECT id_hogar, aplicada_por FROM hogar WHERE ref = $1`, [ref]);
      this.exigirPropio(h, usuario);
      return this.progreso(m, h.id_hogar);
    });
  }

  // ---------- helpers ----------
  /** Ejecuta en transacción, deja `actor` en la bitácora y traduce los errores de la base. */
  private async tx<T>(actor: string | null, fn: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction(async (m) => {
        if (actor) await m.query(`SELECT set_config('app.actor', $1, true)`, [actor]);
        return fn(m);
      });
    } catch (error) {
      throw this.traducir(error);
    }
  }

  /** Bloquea el hogar, exige que siga en borrador y ejecuta el cambio; devuelve el avance actualizado. */
  private editar(ref: string, usuario: Usuario, fn: (m: EntityManager, idHogar: string) => Promise<unknown>) {
    return this.tx(null, async (m) => {
      const [h] = await m.query(`SELECT id_hogar, estado, aplicada_por FROM hogar WHERE ref = $1 FOR UPDATE`, [ref]);
      this.exigirPropio(h, usuario);
      if (h.estado === 'sin_autorizacion') throw new ConflictException('La familia no autorizó el tratamiento de datos: no se admite más información');
      if (h.estado !== 'borrador') throw new ConflictException(`El hogar está '${h.estado}' y ya no se puede modificar`);
      await m.query(`SELECT set_config('app.actor', $1, true)`, [h.aplicada_por]);
      await fn(m, h.id_hogar);
      return this.progreso(m, h.id_hogar);
    });
  }

  /** Un voluntario solo toca sus hogares; de los ajenos responde 404 para no revelar que existen. */
  private exigirPropio(h: Fila | undefined, usuario: Usuario) {
    if (h?.aplicada_por !== usuario.email) throw new NotFoundException('No existe el hogar');
  }

  /** Lo único que se devuelve al front: avance, qué falta y alertas calculadas. */
  private async progreso(m: EntityManager, idHogar: string) {
    const [f] = await m.query(`SELECT * FROM v_progreso_hogar WHERE id_hogar = $1`, [idHogar]);
    const [{ faltantes }] = await m.query(`SELECT hogar_faltantes($1) AS faltantes`, [idHogar]);
    return {
      ...this.cabecera(f),
      faltantes: faltantes as string[],
      puedeCompletar: f.estado === 'borrador' && faltantes.length === 0,
      resumen: {
        numPersonas: f.num_personas,
        ninos: f.num_ninos,
        adultosMayores: f.adultos_mayores,
        totalDano: f.total_dano,
      },
      alertas: {
        duermeEnRiesgo: f.duerme_en_riesgo,
        urgenteSalud: f.urgente_salud,
        urgenteAguaAlimento: f.urgente_agua_alimento,
        electricaRiesgo: f.electrica_riesgo,
      },
      requiereSeguimiento: f.requiere_seguimiento,
    };
  }

  private cabecera(f: Fila) {
    return {
      ref: f.ref,
      codigo: f.codigo_hogar,
      estado: f.estado,
      sector: f.sector,
      fechaAplicacion: fechaISO(f.fecha_aplicacion as Date),
      aplicadaPor: f.aplicada_por,
      actualizadoEn: f.updated_at,
      pasos: {
        contacto: f.paso_contacto,
        composicion: f.paso_composicion,
        vivienda: f.paso_vivienda,
        necesidades: f.paso_necesidades,
        atencion: f.paso_atencion,
      },
    };
  }

  /** Errores de la base → HTTP. Nunca se registra el cuerpo ni los parámetros: pueden traer datos personales. */
  private traducir(error: unknown): Error {
    if (error instanceof HttpException) return error;
    const driver = (error as { driverError?: { code?: string; constraint?: string; message?: string } }).driverError;
    switch (driver?.code) {
      case FALTA_PARA_COMPLETAR:
        return new BadRequestException((driver.message ?? '').split('; '));
      case '23505':
        return new ConflictException(
          driver.constraint === 'hogar_contacto_direccion_uq'
            ? 'Ya existe un hogar registrado con esa dirección; consulta con coordinación'
            : 'El registro ya existe',
        );
      case '23514':
        return new BadRequestException(REGLAS[driver.constraint ?? ''] ?? 'Algún dato no cumple las reglas del formulario');
      default:
        this.logger.error(`Error de base de datos ${driver?.code ?? ''}: ${driver?.message ?? (error as Error).message}`);
        return new InternalServerErrorException('No fue posible guardar la información');
    }
  }
}
