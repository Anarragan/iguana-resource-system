import { Column, Entity, PrimaryColumn } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import type { Id } from '../enums.ts';

// Secciones 1:1 de la ficha (PK = FK) y filas repetidas que cuelgan de ella.
// Cada una se reemplaza completa al guardar su paso del asistente.
const idFicha = () =>
  PrimaryColumn({ name: 'id_ficha', type: 'bigint', transformer: idTransformer });

@Entity({ name: 'ficha_respondente' }) // Mód.1 P5-P7
export class Respondente {
  @idFicha() idFicha!: Id;
  @Column({ name: 'es_jefe', type: 'boolean' }) esJefe!: boolean;
  @Column({ type: 'varchar', length: 60, nullable: true }) parentesco!: string | null;
  @Column({ type: 'varchar', length: 25, default: 'prefiere_no_responder' }) genero!: string;
  @Column({ type: 'smallint', nullable: true }) edad!: number | null;
}

@Entity({ name: 'ficha_escolaridad' }) // Mód.1 P12-P14, solo si hay menores
export class Escolaridad {
  @idFicha() idFicha!: Id;
  @Column({ name: 'dejaron_de_asistir', type: 'boolean' }) dejaronDeAsistir!: boolean;
  @Column({ name: 'dias_sin_asistir', type: 'smallint', nullable: true }) diasSinAsistir!: number | null;
  @Column({ name: 'manejo_estudios', type: 'varchar', length: 20, nullable: true }) manejoEstudios!: string | null;
  @Column({ name: 'manejo_otro', type: 'varchar', length: 150, nullable: true }) manejoOtro!: string | null;
}

@Entity({ name: 'ficha_situacion' }) // Mód.2 escalares + Mód.3 + cierre
export class Situacion {
  @idFicha() idFicha!: Id;
  @Column({ name: 'medio_alerta', type: 'varchar', length: 20, nullable: true }) medioAlerta!: string | null;
  @Column({ name: 'medio_alerta_otro', type: 'varchar', length: 150, nullable: true }) medioAlertaOtro!: string | null;
  @Column({ name: 'lugar_pernocta', type: 'varchar', length: 30, nullable: true }) lugarPernocta!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) ingresos!: string | null;
  @Column({ name: 'ingresos_otro', type: 'varchar', length: 150, nullable: true }) ingresosOtro!: string | null;
  @Column({ name: 'electrica_danada', type: 'boolean', default: false }) electricaDanada!: boolean;
  @Column({ type: 'varchar', length: 10, nullable: true }) lodo!: string | null;
  @Column({ type: 'varchar', length: 15, nullable: true }) acceso!: string | null;
  @Column({ name: 'vivienda_vista', type: 'boolean', default: false }) viviendaVista!: boolean;
  @Column({ name: 'apoyo_emocional', type: 'boolean', default: false }) apoyoEmocional!: boolean;
  @Column({ name: 'num_mascotas', type: 'smallint', default: 0 }) numMascotas!: number;
}

@Entity({ name: 'ficha_atencion' }) // Mód.4 escalares
export class Atencion {
  @idFicha() idFicha!: Id;
  @Column({ name: 'censo_previo', type: 'varchar', length: 10, default: 'no_sabe' }) censoPrevio!: string;
  @Column({ name: 'censo_quien', type: 'varchar', length: 150, nullable: true }) censoQuien!: string | null;
  @Column({ type: 'varchar', length: 25, default: 'nadie_ha_ido' }) dictamen!: string;
  @Column({ name: 'inscrita_rud', type: 'varchar', length: 10, default: 'no_sabe' }) inscritaRud!: string;
  @Column({ name: 'oferta_recibida', type: 'boolean', default: false }) ofertaRecibida!: boolean;
  @Column({ name: 'oferta_aceptada', type: 'boolean', nullable: true }) ofertaAceptada!: boolean | null;
}

@Entity({ name: 'ficha_menor' }) // Mód.1 P9: nº de niños = COUNT(*)
export class Menor {
  @PrimaryColumn({ name: 'id_menor', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idMenor!: Id;
  @Column({ name: 'id_ficha', type: 'bigint', transformer: idTransformer }) idFicha!: Id;
  @Column({ type: 'smallint' }) edad!: number;
}

@Entity({ name: 'ficha_grupo' }) // adultos mayores, discapacidad, embarazo, cuidados, cuidadores, sostén
export class Grupo {
  @idFicha() idFicha!: Id;
  @PrimaryColumn({ type: 'varchar', length: 30 }) grupo!: string;
  @Column({ type: 'smallint' }) cantidad!: number;
}

@Entity({ name: 'dano' }) // Mód.2 P6: siempre una fila por categoría, incluso con 0
export class Dano {
  @idFicha() idFicha!: Id;
  @PrimaryColumn({ type: 'varchar', length: 40 }) categoria!: string;
  @Column({ type: 'smallint' }) nivel!: number;
}

@Entity({ name: 'ficha_visitante' }) // Mód.4 P1 (multi-selección)
export class Visitante {
  @idFicha() idFicha!: Id;
  @PrimaryColumn({ type: 'varchar', length: 40 }) actor!: string;
  @Column({ type: 'varchar', length: 150, nullable: true }) detalle!: string | null;
}
