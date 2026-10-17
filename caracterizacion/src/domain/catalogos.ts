// Única fuente de las opciones del formulario: de aquí salen GET /catalogos (el front arma las pantallas)
// y las listas que validan los DTOs. Los códigos deben coincidir con los CHECK de db/migrations/004_esquema_compacto.sql.
export interface Opcion {
  codigo: string;
  etiqueta: string;
}

const op = (...pares: [string, string][]): Opcion[] => pares.map(([codigo, etiqueta]) => ({ codigo, etiqueta }));

export const OPCIONES = {
  triestado: op(['si', 'Sí'], ['no', 'No'], ['no_sabe', 'No sabe']),
  generos: op(
    ['femenino', 'Femenino'],
    ['masculino', 'Masculino'],
    ['no_binario_otro', 'No binario / otro'],
    ['prefiere_no_responder', 'Prefiere no responder'],
  ),
  materialParedes: op(
    ['concreto_ladrillo', 'Concreto o ladrillo'],
    ['madera_tablaroca', 'Madera o tablaroca'],
    ['bahareque_adobe', 'Bahareque o adobe'],
    ['zinc_carton_madera_no_tratada', 'Zinc, cartón o madera no tratada'],
    ['reciclado_desecho', 'Material reciclado o de desecho'],
  ),
  nivelAgua: op(
    ['no_entro', 'No entró agua'],
    ['tobillo', 'Hasta el tobillo'],
    ['rodilla', 'Hasta la rodilla'],
    ['cintura', 'Hasta la cintura'],
    ['pecho', 'Hasta el pecho'],
    ['techo', 'Hasta el techo'],
  ),
  medioAlerta: op(
    ['alerta_oficial', 'Alerta oficial'],
    ['vecinos', 'Vecinos'],
    ['sirena', 'Sirena'],
    ['no_se_entero', 'No se enteró'],
    ['otro', 'Otro'],
  ),
  pernocta: op(
    ['misma_vivienda', 'En la misma vivienda'],
    ['familiares_amistades', 'Donde familiares o amistades'],
    ['albergue', 'En un albergue'],
    ['arrendado_temporal', 'En un lugar arrendado temporalmente'],
    ['intemperie_improvisado', 'A la intemperie o en un lugar improvisado'],
    ['sin_lugar', 'Sin lugar donde dormir'],
  ),
  ingresos: op(
    ['interrumpida_total', 'Fuente de ingresos interrumpida del todo'],
    ['reducida_temporal', 'Reducida temporalmente'],
    ['no_afectada', 'No se afectó'],
    ['otro', 'Otro'],
  ),
  lodo: op(['nada', 'Nada'], ['poco', 'Poco'], ['mucho', 'Mucho']),
  acceso: op(['despejado', 'Despejado'], ['con_escombros', 'Con escombros'], ['bloqueado', 'Bloqueado']),
  escolarEstado: op(['siguen_asistiendo', 'Siguen asistiendo'], ['dejaron_de_asistir', 'Dejaron de asistir']),
  escolarManejo: op(
    ['normalidad', 'Con normalidad'],
    ['con_dificultades', 'Con dificultades'],
    ['no_estudia', 'No estudia'],
    ['otro', 'Otro'],
  ),
  dictamen: op(
    ['puede_habitarse', 'Puede habitarse'],
    ['evacuacion_temporal', 'Evacuación temporal'],
    ['evacuacion_definitiva', 'Evacuación definitiva'],
    ['nadie_ha_ido', 'Nadie ha ido a evaluar'],
  ),
  visitas: op(
    ['alcaldia_dagrd', 'Alcaldía / DAGRD'],
    ['jac', 'Junta de Acción Comunal'],
    ['cruz_roja_defensa_civil_bomberos', 'Cruz Roja, Defensa Civil o Bomberos'],
    ['organizacion_voluntarios', 'Organización o voluntarios'],
    ['otro', 'Otro'],
    ['nadie', 'Nadie'],
  ),
  ayudasRecibidas: op(
    ['kit_aseo', 'Kit de aseo'],
    ['alimentos', 'Alimentos'],
    ['colchoneta', 'Colchoneta'],
    ['agua', 'Agua'],
    ['otra', 'Otra'],
    ['ninguna', 'Ninguna'],
  ),
  estados: op(['borrador', 'Borrador'], ['completo', 'Completo'], ['sin_autorizacion', 'Sin autorización']),
};

/** Mód.1: cuántas personas del hogar hay en cada grupo (campo del PUT /composicion). */
export const GRUPOS_INTEGRANTES = [
  { campo: 'adultosMayores', etiqueta: 'Personas adultas mayores (60+)' },
  { campo: 'conDiscapacidad', etiqueta: 'Personas con discapacidad o diversidad funcional' },
  { campo: 'embarazoLactancia', etiqueta: 'Mujeres embarazadas o en lactancia' },
  { campo: 'cuidadosEspeciales', etiqueta: 'Personas que requieren cuidados especiales' },
  { campo: 'cuidadores', etiqueta: 'Personas que asumen el cuidado del hogar' },
  { campo: 'sostenimiento', etiqueta: 'Personas que asumen el sostenimiento económico' },
];

/** Mód.2 P6: una fila por categoría; `campo` es el nombre en el PUT /vivienda. */
export const CATEGORIAS_DANO = [
  { campo: 'danoEstructura', etiqueta: 'Estructura (paredes, pisos, cimientos)' },
  { campo: 'danoTechoPuertasVentanas', etiqueta: 'Techo, puertas y ventanas' },
  { campo: 'danoInstalaciones', etiqueta: 'Instalaciones (luz, agua, baño)' },
  { campo: 'danoMueblesElectrodomesticos', etiqueta: 'Muebles y electrodomésticos' },
  { campo: 'danoRopaEnseres', etiqueta: 'Ropa y enseres' },
  { campo: 'danoHerramientasTrabajo', etiqueta: 'Herramientas de trabajo o negocio' },
  { campo: 'danoDocumentos', etiqueta: 'Documentos' },
  { campo: 'danoAnimales', etiqueta: 'Animales' },
];

export const ESCALA_DANO = op(
  ['0', 'Sin daño'],
  ['1', 'Leve'],
  ['2', 'Moderado'],
  ['3', 'Severo'],
  ['4', 'Pérdida total'],
);

/** Mód.3: la lista que marca la familia, agrupada como se muestra en pantalla. */
export const GRUPOS_NECESIDAD = [
  { codigo: 'alimentacion', etiqueta: 'Alimentación', items: op(['alimentos', 'Alimentos'], ['agua_beber', 'Agua para beber'], ['alimento_mascotas', 'Alimento para mascotas']) },
  { codigo: 'aseo_personal', etiqueta: 'Aseo personal', items: op(['articulos_aseo_personal', 'Artículos de aseo personal']) },
  { codigo: 'higiene_menstrual', etiqueta: 'Higiene menstrual y reproductiva', items: op(['higiene_menstrual_reproductiva', 'Artículos de higiene menstrual y reproductiva']) },
  {
    codigo: 'aseo_hogar',
    etiqueta: 'Aseo del hogar',
    items: op(['productos_limpieza', 'Productos de limpieza'], ['ayuda_limpiar_lodo_escombros', 'Ayuda para limpiar lodo o sacar escombros']),
  },
  {
    codigo: 'enseres_vivienda',
    etiqueta: 'Enseres y vivienda',
    items: op(
      ['colchones_camas', 'Colchones o camas'],
      ['ropa_calzado', 'Ropa y calzado'],
      ['electrodomesticos', 'Estufa, nevera u otros electrodomésticos'],
      ['materiales_reparacion', 'Materiales para reparar la vivienda'],
    ),
  },
  { codigo: 'trabajo', etiqueta: 'Trabajo', items: op(['herramientas_insumos_negocio', 'Herramientas de trabajo o insumos del negocio']) },
  {
    codigo: 'salud_cuidado',
    etiqueta: 'Salud y cuidado',
    items: op(
      ['medicamentos_atencion_medica', 'Medicamentos o atención médica'],
      ['utiles_escolares_ninos', 'Útiles escolares o elementos para niños, niñas y adolescentes'],
      ['otro_condicion_especial', 'Otro elemento por condición especial'],
    ),
  },
];

/** Todo lo que el front necesita para armar el formulario sin escribir una sola opción a mano. */
export const CATALOGOS = {
  ...OPCIONES,
  gruposIntegrantes: GRUPOS_INTEGRANTES,
  categoriasDano: CATEGORIAS_DANO,
  escalaDano: ESCALA_DANO,
  gruposNecesidad: GRUPOS_NECESIDAD,
};
