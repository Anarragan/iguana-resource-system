import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Hogar } from './hogar.js';
import { Familia } from './familia.js';
import type { EstadoVerificacionEntrega, Id } from '../enums.ts';

// La base exige (idHogar xor idFamilia) o ambos null con estado en_revision (CHECK).
@Entity({ name: 'entrega_ayuda' })
export class EntregaAyuda {
  @PrimaryColumn({ name: 'id_entrega', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idEntrega!: Id;

  @Column({ name: 'id_hogar', type: 'bigint', nullable: true, transformer: idTransformer })
  idHogar!: Id | null;

  @ManyToOne(() => Hogar, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'id_hogar' })
  hogar?: Relation<Hogar> | null;

  @Column({ name: 'id_familia', type: 'bigint', nullable: true, transformer: idTransformer })
  idFamilia!: Id | null;

  @ManyToOne(() => Familia, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'id_familia' })
  familia?: Relation<Familia> | null;

  @Column({ name: 'tipo_ayuda', type: 'varchar' })
  tipoAyuda!: string;

  @Column({ name: 'cantidad', type: 'numeric', transformer: idTransformer })
  cantidad!: number;

  @Column({ name: 'fecha_entrega', type: 'date', nullable: true })
  fechaEntrega!: string | null;

  @Column({ name: 'entidad_donante', type: 'varchar', nullable: true })
  entidadDonante!: string | null;

  @Column({ name: 'estado_verificacion', type: 'varchar' })
  estadoVerificacion!: EstadoVerificacionEntrega;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'fecha_registro', type: 'timestamptz', insert: false, update: false })
  fechaRegistro!: Date;
}
