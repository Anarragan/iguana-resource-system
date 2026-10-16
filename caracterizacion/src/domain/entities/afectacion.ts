import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Familia } from './familia.js';
import type { CategoriaAfectacion, EstadoVerificacionAfectacion, Id, NivelAfectacion } from '../enums.ts';

@Entity({ name: 'afectacion' })
export class Afectacion {
  @PrimaryColumn({ name: 'id_afectacion', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idAfectacion!: Id;

  @Column({ name: 'id_familia', type: 'bigint', transformer: idTransformer })
  idFamilia!: Id;

  @ManyToOne(() => Familia, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_familia' })
  familia?: Relation<Familia>;

  @Column({ name: 'categoria', type: 'varchar' })
  categoria!: CategoriaAfectacion;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion!: string;

  @Column({ name: 'nivel_afectacion', type: 'varchar' })
  nivelAfectacion!: NivelAfectacion;

  @Column({ name: 'fecha_reporte', type: 'timestamptz', insert: false, update: false })
  fechaReporte!: Date;

  @Column({ name: 'estado_verificacion', type: 'varchar', insert: false })
  estadoVerificacion!: EstadoVerificacionAfectacion;
}
