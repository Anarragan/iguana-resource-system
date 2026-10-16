import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Familia } from './familia.js';
import type { CategoriaNecesidad, EstadoNecesidad, Id, NivelUrgencia } from '../enums.ts';

@Entity({ name: 'necesidad' })
export class Necesidad {
  @PrimaryColumn({ name: 'id_necesidad', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idNecesidad!: Id;

  @Column({ name: 'id_familia', type: 'bigint', transformer: idTransformer })
  idFamilia!: Id;

  @ManyToOne(() => Familia, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_familia' })
  familia?: Relation<Familia>;

  @Column({ name: 'categoria', type: 'varchar' })
  categoria!: CategoriaNecesidad;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion!: string;

  @Column({ name: 'nivel_urgencia', type: 'varchar' })
  nivelUrgencia!: NivelUrgencia;

  @Column({ name: 'estado', type: 'varchar', insert: false })
  estado!: EstadoNecesidad;

  @Column({ name: 'fecha_registro', type: 'timestamptz', insert: false, update: false })
  fechaRegistro!: Date;
}
