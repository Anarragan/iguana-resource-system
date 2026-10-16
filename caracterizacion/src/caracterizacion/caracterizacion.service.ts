import { randomUUID } from 'node:crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Hogar } from '../domain/entities/hogar.js';
import { Familia } from '../domain/entities/familia.js';
import { Persona } from '../domain/entities/persona.js';
import { Afectacion } from '../domain/entities/afectacion.js';
import { Necesidad } from '../domain/entities/necesidad.js';
import type {
  CategoriaAfectacion,
  CategoriaNecesidad,
  NivelAfectacion,
  NivelUrgencia,
} from '../domain/enums.ts';
import {
  CATEGORIAS_AFECTACION,
  CATEGORIAS_NECESIDAD,
  NIVELES_AFECTACION,
  NIVELES_URGENCIA,
  SECTOR,
} from '../domain/catalogos.js';
import { CrearCaracterizacionDto } from './dto/crear-caracterizacion.dto.js';

const PREFIJO_HOGAR = 'HOG';
const PREFIJO_FAMILIA = 'FAM';

/** HOG-0001, FAM-0001... crece a más dígitos si hace falta. */
const formatearCodigo = (prefijo: string, id: number) =>
  `${prefijo}-${String(id).padStart(4, '0')}`;

/** Marcador único (≤20 caracteres, límite de la columna) mientras se conoce el id definitivo. */
const codigoTemporal = () => `TMP${randomUUID().replaceAll('-', '').slice(0, 16)}`;

@Injectable()
export class CaracterizacionService {
  private readonly logger = new Logger(CaracterizacionService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async catalogos() {
    return {
      categoriasAfectacion: CATEGORIAS_AFECTACION,
      nivelesAfectacion: NIVELES_AFECTACION,
      categoriasNecesidad: CATEGORIAS_NECESIDAD,
      nivelesUrgencia: NIVELES_URGENCIA,
    };
  }

  async listar(limite: number, desde: number) {
    const filas: {
      id_familia: string;
      codigo_familia: string;
      nombre_referencia: string;
      telefono_contacto: string | null;
      fecha_caracterizacion: Date;
      estado_verificacion: string;
      id_hogar: string;
      codigo_hogar: string;
      direccion: string;
      sector: string;
      observaciones: string | null;
      personas: number;
      afectaciones: number;
      necesidades: number;
    }[] = await this.dataSource.query(
      `SELECT f.id_familia, f.codigo_familia, f.nombre_referencia, f.telefono_contacto,
              f.fecha_caracterizacion, f.estado_verificacion,
              h.id_hogar, h.codigo_hogar, h.direccion, h.sector, h.observaciones,
              (SELECT count(*)::int FROM persona p WHERE p.id_familia = f.id_familia) AS personas,
              (SELECT count(*)::int FROM afectacion a WHERE a.id_familia = f.id_familia) AS afectaciones,
              (SELECT count(*)::int FROM necesidad n WHERE n.id_familia = f.id_familia) AS necesidades
         FROM familia f
         JOIN hogar h ON h.id_hogar = f.id_hogar
        ORDER BY f.fecha_caracterizacion DESC, f.id_familia DESC
        LIMIT $1 OFFSET $2`,
      [limite, desde],
    );

    return filas.map((r) => ({
      familia: {
        id: Number(r.id_familia),
        codigo: r.codigo_familia,
        nombreReferencia: r.nombre_referencia,
        telefonoContacto: r.telefono_contacto,
        fechaCaracterizacion: r.fecha_caracterizacion,
        estadoVerificacion: r.estado_verificacion,
      },
      hogar: {
        id: Number(r.id_hogar),
        codigo: r.codigo_hogar,
        direccionReferencia: r.direccion,
        sector: r.sector,
        observaciones: r.observaciones,
      },
      resumen: {
        personas: r.personas,
        afectaciones: r.afectaciones,
        necesidades: r.necesidades,
      },
    }));
  }

  /** `idFamilia`: id de la familia; el hogar se resuelve por su relación. */
  async obtener(idFamilia: number) {
    const manager = this.dataSource.manager;
    const familia = await manager.findOne(Familia, {
      where: { idFamilia },
      relations: { hogar: true },
    });
    if (!familia?.hogar) {
      throw new NotFoundException(`No existe una familia con id ${idFamilia}`);
    }
    const { hogar, ...datosFamilia } = familia;

    const [personas, afectaciones, necesidades] = await Promise.all([
      manager.find(Persona, { where: { idFamilia }, order: { idPersona: 'ASC' } }),
      manager.find(Afectacion, { where: { idFamilia }, order: { idAfectacion: 'ASC' } }),
      manager.find(Necesidad, { where: { idFamilia }, order: { idNecesidad: 'ASC' } }),
    ]);

    return {
      hogar: {
        id: hogar.idHogar,
        codigo: hogar.codigoHogar,
        direccionReferencia: hogar.direccionReferencia,
        sector: hogar.sector,
        observaciones: hogar.observaciones,
        fechaRegistro: hogar.fechaRegistro,
      },
      familia: {
        id: datosFamilia.idFamilia,
        codigo: datosFamilia.codigoFamilia,
        nombreReferencia: datosFamilia.nombreReferencia,
        telefonoContacto: datosFamilia.telefonoContacto,
        fechaCaracterizacion: datosFamilia.fechaCaracterizacion,
        estadoVerificacion: datosFamilia.estadoVerificacion,
      },
      personas: personas.map((p) => ({
        id: p.idPersona,
        nombres: p.nombres,
        fechaNacimiento: p.fechaNacimiento,
        requiereApoyo: p.requiereApoyo,
        observaciones: p.observaciones,
      })),
      afectaciones: afectaciones.map((a) => ({
        id: a.idAfectacion,
        categoria: a.categoria,
        descripcion: a.descripcion,
        nivelAfectacion: a.nivelAfectacion,
        fechaReporte: a.fechaReporte,
        estadoVerificacion: a.estadoVerificacion,
      })),
      necesidades: necesidades.map((n) => ({
        id: n.idNecesidad,
        categoria: n.categoria,
        descripcion: n.descripcion,
        nivelUrgencia: n.nivelUrgencia,
        estado: n.estado,
        fechaRegistro: n.fechaRegistro,
      })),
    };
  }

  /** Registra hogar, familia, personas, afectaciones y necesidades de forma atómica. */
  async crear(dto: CrearCaracterizacionDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // El código se deriva del id que asigna la base, que solo se conoce tras el
        // insert; por eso se inserta con un valor temporal único y se actualiza
        // dentro de la misma transacción (nunca queda visible).
        const hogar = await manager.save(
          manager.create(Hogar, {
            codigoHogar: codigoTemporal(),
            direccionReferencia: dto.hogar.direccionReferencia,
            sector: SECTOR,
            observaciones: dto.hogar.observaciones ?? null,
          }),
        );
        hogar.codigoHogar = formatearCodigo(PREFIJO_HOGAR, hogar.idHogar);
        await manager.update(Hogar, { idHogar: hogar.idHogar }, { codigoHogar: hogar.codigoHogar });

        const familia = await manager.save(
          manager.create(Familia, {
            codigoFamilia: codigoTemporal(),
            idHogar: hogar.idHogar,
            nombreReferencia: dto.familia.nombreReferencia,
            telefonoContacto: dto.familia.telefonoContacto ?? null,
          }),
        );
        familia.codigoFamilia = formatearCodigo(PREFIJO_FAMILIA, familia.idFamilia);
        await manager.update(
          Familia,
          { idFamilia: familia.idFamilia },
          { codigoFamilia: familia.codigoFamilia },
        );

        const personas = await manager.save(
          dto.personas.map((p) =>
            manager.create(Persona, {
              idFamilia: familia.idFamilia,
              nombres: p.nombres,
              fechaNacimiento: p.fechaNacimiento ?? null,
              requiereApoyo: p.requiereApoyo ?? false,
              observaciones: p.observaciones ?? null,
            }),
          ),
        );

        const afectaciones = await manager.save(
          dto.afectaciones.map((a) =>
            manager.create(Afectacion, {
              idFamilia: familia.idFamilia,
              categoria: a.categoria as CategoriaAfectacion,
              descripcion: a.descripcion,
              nivelAfectacion: a.nivelAfectacion as NivelAfectacion,
            }),
          ),
        );

        const necesidades = await manager.save(
          dto.necesidades.map((n) =>
            manager.create(Necesidad, {
              idFamilia: familia.idFamilia,
              categoria: n.categoria as CategoriaNecesidad,
              descripcion: n.descripcion,
              nivelUrgencia: n.nivelUrgencia as NivelUrgencia,
            }),
          ),
        );

        // Contrato de salida: lo que la pantalla "Caracterización registrada" muestra.
        return {
          mensaje: 'Caracterización registrada correctamente',
          hogar: { id: hogar.idHogar, codigo: hogar.codigoHogar },
          familia: { id: familia.idFamilia, codigo: familia.codigoFamilia },
          resumen: {
            personas: personas.length,
            afectaciones: afectaciones.length,
            necesidades: necesidades.length,
          },
          idsPersonas: personas.map((p) => p.idPersona),
          idsAfectaciones: afectaciones.map((a) => a.idAfectacion),
          idsNecesidades: necesidades.map((n) => n.idNecesidad),
        };
      });
    } catch (error) {
      this.logger.error('Error al registrar la caracterización', error);
      throw new InternalServerErrorException(
        'No fue posible registrar la caracterización',
      );
    }
  }
}
