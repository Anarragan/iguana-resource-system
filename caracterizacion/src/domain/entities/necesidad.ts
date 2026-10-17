import { Column, Entity, PrimaryColumn } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import type { Id } from '../enums.ts';

// Mód.3: una fila por casilla marcada. prioridad 1..3 = "lo más urgente"; detalle solo para "otro".
@Entity({ name: 'necesidad' })
export class Necesidad {
  @PrimaryColumn({ name: 'id_necesidad', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idNecesidad!: Id;
  @Column({ name: 'id_ficha', type: 'bigint', transformer: idTransformer }) idFicha!: Id;
  @Column({ type: 'varchar', length: 40 }) item!: string;
  @Column({ type: 'smallint', nullable: true }) prioridad!: number | null;
  @Column({ type: 'text', nullable: true }) detalle!: string | null;
  @Column({ type: 'varchar', length: 15, insert: false }) estado!: string;
}
