import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Hogar } from './hogar.js';
import type { EstadoVerificacionFamilia, Id } from '../enums.ts';

@Entity({ name: 'familia' })
export class Familia {
  @PrimaryColumn({ name: 'id_familia', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idFamilia!: Id;

  @Column({ name: 'codigo_familia', type: 'varchar', length: 20, unique: true })
  codigoFamilia!: string;

  @Column({ name: 'id_hogar', type: 'bigint', transformer: idTransformer })
  idHogar!: Id;

  @ManyToOne(() => Hogar, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_hogar' })
  hogar?: Relation<Hogar>;

  @Column({ name: 'nombre_referencia', type: 'varchar', length: 150 })
  nombreReferencia!: string;

  @Column({ name: 'telefono_contacto', type: 'varchar', length: 30, nullable: true })
  telefonoContacto!: string | null;

  @Column({ name: 'fecha_caracterizacion', type: 'timestamptz', insert: false, update: false })
  fechaCaracterizacion!: Date;

  @Column({ name: 'estado_verificacion', type: 'varchar', insert: false })
  estadoVerificacion!: EstadoVerificacionFamilia;
}
