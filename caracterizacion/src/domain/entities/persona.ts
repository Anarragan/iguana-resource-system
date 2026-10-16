import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Familia } from './familia.js';
import type { Id } from '../enums.ts';

@Entity({ name: 'persona' })
export class Persona {
  @PrimaryColumn({ name: 'id_persona', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idPersona!: Id;

  @Column({ name: 'id_familia', type: 'bigint', transformer: idTransformer })
  idFamilia!: Id;

  @ManyToOne(() => Familia, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_familia' })
  familia?: Relation<Familia>;

  @Column({ name: 'nombres', type: 'varchar', length: 150 })
  nombres!: string;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento!: string | null;

  @Column({ name: 'requiere_apoyo', type: 'boolean', default: false })
  requiereApoyo!: boolean;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;
}
