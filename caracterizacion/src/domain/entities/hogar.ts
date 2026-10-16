import { Column, Entity, PrimaryColumn } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import type { Id } from '../enums.ts';

@Entity({ name: 'hogar' })
export class Hogar {
  @PrimaryColumn({ name: 'id_hogar', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idHogar!: Id;

  @Column({ name: 'codigo_hogar', type: 'varchar', length: 20, unique: true })
  codigoHogar!: string;

  @Column({ name: 'direccion', type: 'text' })
  direccionReferencia!: string;

  @Column({ name: 'sector', type: 'varchar', length: 100 })
  sector!: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'fecha_registro', type: 'timestamptz', insert: false, update: false })
  fechaRegistro!: Date;
}
