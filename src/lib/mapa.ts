import { listSources } from './sources';
import { OPERACIONES } from './operations';

// EL MAPA DEL SISTEMA, derivado y no escrito a mano.
//
// Las marcas salen del registro de fuentes y las operaciones del catálogo: si el
// mapa se escribiera a mano, sería la primera cosa en quedar vieja — y un mapa
// viejo es peor que no tener mapa, porque manda a alguien a la capa equivocada
// con confianza.
//
// Lo único que sí se escribe acá es la DOCTRINA: qué hace cada capa, qué no le
// corresponde, y quién manda sobre cada campo compartido. Eso no se puede
// derivar de nada porque es precisamente lo que se decidió.

export type Capa = {
  id: string;
  nombre: string;
  /** Un verbo. Si dos capas comparten verbo, una de las dos está de más. */
  verbo: string;
  quees: string;
  hace: string[];
  /** Lo que NO le corresponde, que es la mitad que más se olvida. */
  noHace: string[];
};

export const CAPAS: Capa[] = [
  {
    id: 'vaults',
    nombre: 'Los vaults de Obsidian',
    verbo: 'Crear',
    quees:
      'Repos de archivos `.md` en disco, con sus agentes y sus skills de voz. ' +
      'Acá está LA VERDAD: no hay base de datos y no va a haber.',
    hace: [
      'Escribir la pieza, el brief, el guion, el creativo.',
      'Guardar el footer con sus metadatos y sus cortes de métricas.',
      'Sostener el catálogo de fórmulas y el framework de campañas.',
      'El learning log: por qué funcionó o no.',
    ],
    noHace: [
      'Coordinar quién hace qué — eso no se ve en una carpeta.',
      'Medir: un `.md` no cruza un export con una pieza.',
      'Ser la interfaz para alguien que no usa Obsidian.',
    ],
  },
  {
    id: 'coordinacion',
    nombre: 'El destino de colaboración',
    verbo: 'Coordinar',
    quees:
      'El tablero donde el trabajo se ve moverse. Es para el equipo, y para lo ' +
      'que está pasando esta semana.',
    hace: [
      'El carril de cada pieza: idea, en producción, publicado.',
      'Planificación y reparto entre personas.',
      'La bandeja de ideas que entran.',
    ],
    noHace: [
      'Ser la fuente de verdad de nada que viva en el vault.',
      'Guardar series de métricas: no tiene el histórico ni el catálogo.',
      'Responder qué fórmula nunca se estrenó — una fórmula sin usar no tiene fila.',
    ],
  },
  {
    id: 'plataforma',
    nombre: 'Esta plataforma',
    verbo: 'Medir',
    quees:
      'La operación de growth. Lee los vaults, prepara operaciones y muestra lo ' +
      'que ninguna de las otras dos capas puede mostrar.',
    hace: [
      'Leer todas las piezas y sus cortes, y cruzarlas con el catálogo.',
      'Cadencia, deuda de medición, uso de fórmulas y cobertura de campañas.',
      'Preparar cada operación: sincronizar, exportar, ingerir.',
      'Captar una idea — materia prima, no trabajo creativo.',
    ],
    noHace: [
      'ESCRIBIR O EDITAR EL CUERPO DE UNA PIEZA. Eso es Obsidian, con sus skills de voz.',
      'Duplicar el tablero de coordinación.',
      'Ejecutar sola: prepara, y una persona dispara y aprueba.',
    ],
  },
];

/**
 * Dueño de cada campo compartido, EN UN SOLO LUGAR.
 *
 * La regla dura 3 dice que nunca escriben los dos lados lo mismo. El riesgo de
 * tener esta tabla dos veces —en el mapa y en la documentación del puente— es
 * que se separen, y el día que se separen nadie va a saber cuál es la buena.
 */
export type DuenoCampo = {
  campo: string;
  dueno: 'vault' | 'coordinación';
  /** Qué pasa si se toca del lado que NO manda. */
  siSeTocaDelOtroLado: string;
};

export const DUENOS: DuenoCampo[] = [
  {
    campo: 'cuerpo de la pieza',
    dueno: 'vault',
    siSeTocaDelOtroLado: 'Se pisa en la próxima sincronización. El tablero muestra una copia.',
  },
  {
    campo: 'fórmula · canal · cuenta · formato',
    dueno: 'vault',
    siSeTocaDelOtroLado: 'Se pisa. El footer del `.md` es el que manda.',
  },
  {
    campo: 'url y fecha de publicación',
    dueno: 'vault',
    siSeTocaDelOtroLado: 'Se pisa. Y sin `url` la pieza no se puede medir: es la llave del ingest.',
  },
  {
    campo: 'cortes de métricas',
    dueno: 'vault',
    siSeTocaDelOtroLado: 'Se pisa. Los escribe la ingesta, y el valor vigente es el último corte.',
  },
  {
    campo: 'estado del kanban',
    dueno: 'coordinación',
    siSeTocaDelOtroLado:
      'Gana el tablero y se escribe de vuelta al `.md`. Es el ÚNICO campo que viaja ' +
      'en los dos sentidos: el vault decide con qué estado NACE la fila, el tablero manda de ahí en adelante.',
  },
  {
    campo: 'asignación a una persona',
    dueno: 'coordinación',
    siSeTocaDelOtroLado: 'No existe del lado del vault. Nadie la pisa.',
  },
  {
    campo: 'identificador de la pieza',
    dueno: 'vault',
    siSeTocaDelOtroLado:
      'Se pisa, y romper el emparejamiento: es la llave con la que el tablero ' +
      'encuentra su `.md` después de que el archivo se mueva.',
  },
];

/** Las marcas que este build conoce, derivadas del registro. */
export function marcasDelMapa() {
  return listSources().map((s) => ({
    id: s.id,
    label: s.label,
    vault: s.vault,
    raices: s.roots.map((r) => r.replace(s.vault + '/', '')),
    campanas: s.ignore.map((r) => r.replace(s.vault + '/', '')),
  }));
}

/** Las operaciones declaradas, agrupadas por su forma de ejecución. */
export function operacionesDelMapa() {
  const porForma = new Map<string, { id: string; nombre: string; descripcion: string; marcas: string | null }[]>();
  for (const op of OPERACIONES) {
    const fila = {
      id: op.id,
      nombre: op.nombre,
      descripcion: op.descripcion,
      marcas: op.marcas ? op.marcas.join(' · ') : null,
    };
    porForma.set(op.forma, [...(porForma.get(op.forma) ?? []), fila]);
  }
  return [...porForma.entries()].map(([forma, operaciones]) => ({ forma, operaciones }));
}
