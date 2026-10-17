import { Column, Entity, PrimaryColumn } from 'typeorm';

// Catálogos: PK = codigo (texto estable). El front arma el formulario con ellos.
@Entity({ name: 'grupo_integrantes' })
export class GrupoIntegrantes {
  @PrimaryColumn({ type: 'varchar', length: 30 }) codigo!: string;
  @Column({ type: 'varchar', length: 120 }) etiqueta!: string;
  @Column({ type: 'smallint' }) orden!: number;
}

@Entity({ name: 'categoria_dano' })
export class CategoriaDano {
  @PrimaryColumn({ type: 'varchar', length: 40 }) codigo!: string;
  @Column({ type: 'varchar', length: 120 }) etiqueta!: string;
  @Column({ type: 'smallint' }) orden!: number;
}

@Entity({ name: 'grupo_necesidad' })
export class GrupoNecesidad {
  @PrimaryColumn({ type: 'varchar', length: 30 }) codigo!: string;
  @Column({ type: 'varchar', length: 120 }) etiqueta!: string;
  @Column({ type: 'smallint' }) orden!: number;
}

@Entity({ name: 'item_necesidad' })
export class ItemNecesidad {
  @PrimaryColumn({ type: 'varchar', length: 40 }) codigo!: string;
  @Column({ type: 'varchar', length: 30 }) grupo!: string;
  @Column({ type: 'varchar', length: 150 }) etiqueta!: string;
  @Column({ type: 'smallint' }) orden!: number;
}

@Entity({ name: 'actor' })
export class Actor {
  @PrimaryColumn({ type: 'varchar', length: 40 }) codigo!: string;
  @Column({ type: 'varchar', length: 120 }) etiqueta!: string;
}

@Entity({ name: 'tipo_ayuda' })
export class TipoAyuda {
  @PrimaryColumn({ type: 'varchar', length: 30 }) codigo!: string;
  @Column({ type: 'varchar', length: 120 }) etiqueta!: string;
}
