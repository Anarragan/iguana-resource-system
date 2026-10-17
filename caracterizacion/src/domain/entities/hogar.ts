import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import type { Id } from '../enums.ts';

// La casa física.
@Entity({ name: 'vivienda' })
export class Vivienda {
  @PrimaryColumn({ name: 'id_vivienda', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idVivienda!: Id;

  @Column({ type: 'text' }) direccion!: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) interior!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) callejon!: string | null;
  @Column({ type: 'varchar', length: 100 }) sector!: string;
  @Column({ name: 'material_paredes', type: 'varchar', nullable: true }) materialParedes!: string | null;
  @Column({ name: 'nivel_agua_max', type: 'varchar', nullable: true }) nivelAguaMax!: string | null;
  @Column({ name: 'inundada_antes', type: 'varchar', default: 'no_sabe' }) inundadaAntes!: string; // DEFAULT 'no_sabe'
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
}

// La unidad encuestada: una persona responde por el hogar.
@Entity({ name: 'hogar' })
export class Hogar {
  @PrimaryColumn({ name: 'id_hogar', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idHogar!: Id;

  @Column({ name: 'codigo_hogar', type: 'varchar', length: 20, unique: true }) codigoHogar!: string;

  @Column({ name: 'id_vivienda', type: 'bigint', transformer: idTransformer }) idVivienda!: Id;
  @ManyToOne(() => Vivienda, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_vivienda' })
  vivienda?: Relation<Vivienda>;

  @Column({ name: 'nombre_referencia', type: 'varchar', length: 150 }) nombreReferencia!: string;
  @Column({ name: 'telefono_contacto', type: 'varchar', length: 30, nullable: true }) telefonoContacto!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
}

// Quien aplica la ficha.
@Entity({ name: 'voluntario' })
export class Voluntario {
  @PrimaryColumn({ name: 'id_voluntario', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idVoluntario!: Id;

  @Column({ type: 'varchar', length: 150, unique: true }) nombre!: string;
}
