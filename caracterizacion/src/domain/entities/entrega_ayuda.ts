import { Column, Entity, PrimaryColumn } from 'typeorm';
import { idTransformer, numericTransformer } from './id.transformer.js';
import type { Id } from '../enums.ts';

// Mód.4 P5 (reportada por la familia, nace de una ficha) y entregas reales del equipo.
// La base exige id_hogar salvo que el estado sea 'en_revision'.
@Entity({ name: 'entrega_ayuda' })
export class EntregaAyuda {
  @PrimaryColumn({ name: 'id_entrega', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idEntrega!: Id;
  @Column({ name: 'id_hogar', type: 'bigint', nullable: true, transformer: idTransformer }) idHogar!: Id | null;
  @Column({ name: 'id_ficha', type: 'bigint', nullable: true, transformer: idTransformer }) idFicha!: Id | null;
  @Column({ name: 'tipo_ayuda', type: 'varchar', length: 30 }) tipoAyuda!: string;
  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer }) cantidad!: number | null;
  @Column({ name: 'fecha_entrega', type: 'date', nullable: true }) fechaEntrega!: string | null;
  @Column({ name: 'entidad_donante', type: 'varchar', length: 150, nullable: true }) entidadDonante!: string | null;
  @Column({ type: 'varchar', length: 15 }) estado!: string;
  @Column({ type: 'text', nullable: true }) observaciones!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
}
