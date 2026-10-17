import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { idTransformer } from './id.transformer.js';
import { Hogar, Voluntario } from './hogar.js';
import type { EstadoFicha, Id } from '../enums.ts';

// Cabecera + Módulo 0. Las secciones del formulario cuelgan de aquí (ver secciones.ts).
@Entity({ name: 'ficha' })
export class Ficha {
  @PrimaryColumn({ name: 'id_ficha', type: 'bigint', generated: 'identity', transformer: idTransformer })
  idFicha!: Id;

  @Column({ name: 'id_hogar', type: 'bigint', transformer: idTransformer }) idHogar!: Id;
  @ManyToOne(() => Hogar, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_hogar' })
  hogar?: Relation<Hogar>;

  @Column({ name: 'id_voluntario', type: 'bigint', transformer: idTransformer }) idVoluntario!: Id;
  @ManyToOne(() => Voluntario)
  @JoinColumn({ name: 'id_voluntario' })
  voluntario?: Relation<Voluntario>;

  @Column({ name: 'fecha_aplicacion', type: 'date' }) fechaAplicacion!: string;
  // Se inserta explícito: 'sin_autorizacion' no puede nacer como borrador (CHECK ficha_consent_chk).
  @Column({ type: 'varchar', length: 20 }) estado!: EstadoFicha;
  @Column({ name: 'autoriza_tratamiento', type: 'boolean' }) autorizaTratamiento!: boolean;
  @Column({ name: 'autoriza_seguimiento', type: 'boolean', default: false }) autorizaSeguimiento!: boolean;
  @Column({ name: 'version_consentimiento', type: 'varchar', length: 20 }) versionConsentimiento!: string;
  @Column({ name: 'num_personas', type: 'smallint', nullable: true }) numPersonas!: number | null;
  @Column({ type: 'text', nullable: true }) observaciones!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', insert: false }) updatedAt!: Date;
}
