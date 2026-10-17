import { GRUPOS_NECESIDAD, OPCIONES, type Opcion } from './catalogos.js';

// Listas de códigos válidos para los DTOs: se derivan de catalogos.ts, no se repiten a mano.
const codigos = (lista: Opcion[]) => lista.map((o) => o.codigo);

export const TRI = codigos(OPCIONES.triestado);
export const GENEROS = codigos(OPCIONES.generos);
export const MATERIALES_PARED = codigos(OPCIONES.materialParedes);
export const NIVELES_AGUA = codigos(OPCIONES.nivelAgua);
export const MEDIOS_ALERTA = codigos(OPCIONES.medioAlerta);
export const LUGARES_PERNOCTA = codigos(OPCIONES.pernocta);
export const INGRESOS = codigos(OPCIONES.ingresos);
export const LODO = codigos(OPCIONES.lodo);
export const ACCESO = codigos(OPCIONES.acceso);
export const ESTADOS_ESCOLARES = codigos(OPCIONES.escolarEstado);
export const MANEJO_ESTUDIOS = codigos(OPCIONES.escolarManejo);
export const DICTAMEN = codigos(OPCIONES.dictamen);
export const VISITAS = codigos(OPCIONES.visitas);
export const AYUDAS_RECIBIDAS = codigos(OPCIONES.ayudasRecibidas);
export const ESTADOS_HOGAR = codigos(OPCIONES.estados);
export const ITEMS_NECESIDAD = GRUPOS_NECESIDAD.flatMap((g) => codigos(g.items));
