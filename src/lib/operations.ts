import { existsSync } from 'node:fs';
import rawConfig from '../../config/sources.json';
import { listSources } from './sources';

// El catálogo de operaciones.
//
// Hoy lo ejecutable del sistema está desparramado en scripts/, en las skills de
// tres vaults, y en lo que quedó de los trabajos agendados. Para correr algo hay
// que acordarse de que existe. Acá se declara una vez: qué hace, qué parámetros
// toma, qué necesita para poder correr, y cómo se ejecuta.
//
// La regla que ordena el archivo: AGREGAR UNA OPERACIÓN ES AGREGAR UNA ENTRADA,
// no tocar la interfaz. Si para sumar una operación hay que editar un componente,
// el catálogo está mal hecho.

// ── las tres formas de ejecución ──────────────────────────────────────────────
//
// La línea no es leer contra escribir: es AUTORÍA contra DERIVACIÓN. Una idea que
// alguien acaba de tipear no tiene nada que revisar — quien la escribió está ahí.
// Un sync que dedujo crear 40 filas y devolver 12 estados al vault, sí.
export type FormaDeEjecucion =
  | 'captura' // la persona escribe el contenido; la app lo guarda y listo
  | 'export' // la app produce un archivo; solo lectura
  | 'sesion'; // la app arma el contexto y lo entrega a una sesión local

export type ValorParam = string;

export type ParamSpec = {
  id: string;
  label: string;
  /** Qué significa, en una línea. Va al contexto que recibe la sesión. */
  ayuda?: string;
  requerido?: boolean;
  /** El default SIEMPRE se declara y siempre se muestra. Nunca un "todos" tácito. */
  porDefecto?: ValorParam;
} & (
  | { kind: 'enum'; valores: readonly ValorParam[] }
  | { kind: 'fecha' }
  | { kind: 'texto'; maxLargo?: number }
  | { kind: 'ruta' }
);

// ── los parámetros comunes ────────────────────────────────────────────────────

const BRANDS = (rawConfig as { brands: { id: string; label: string }[] }).brands;

/** Las marcas salen de config/sources.json, que es donde ya viven. */
export const MARCAS = BRANDS.map((b) => b.id);

/**
 * Ads y orgánico son una DIMENSIÓN PROPIA, no un valor más de `canal`. Son dos
 * formas de medir distintas y ya están separadas en el vault y en el destino de
 * coordinación. Ponerlo al nivel de canal sería sugerir que un ad es un canal más,
 * que es justo el error que este proyecto viene corrigiendo.
 */
export const MATERIAS = ['organico', 'ads', 'ambos'] as const;

/** Enum cerrado del contrato de footer (docs/footer-contract.md). */
export const CANALES = ['X', 'LinkedIn', 'Instagram', 'Blog', 'TikTok'] as const;
export const ESTADOS = ['idea', 'draft', 'publicado'] as const;

export const PARAM_MARCA: ParamSpec = {
  id: 'marca',
  label: 'Marca',
  kind: 'enum',
  valores: MARCAS,
  requerido: true,
  ayuda: 'Las dos marcas no se mezclan: una operación corre sobre una sola.',
};

export const PARAM_MATERIA: ParamSpec = {
  id: 'materia',
  label: 'Orgánico / campañas',
  kind: 'enum',
  valores: MATERIAS,
  porDefecto: 'organico',
  ayuda: 'Dimensión propia, no un canal. El default es explícito y se muestra antes de ejecutar.',
};

export const PARAM_CANAL: ParamSpec = {
  id: 'canal',
  label: 'Canal',
  kind: 'enum',
  valores: CANALES,
  ayuda: 'Sin valor = todos los canales.',
};

export const PARAM_ESTADO: ParamSpec = {
  id: 'estado',
  label: 'Estado',
  kind: 'enum',
  valores: ESTADOS,
};

export const PARAM_DESDE: ParamSpec = { id: 'desde', label: 'Desde', kind: 'fecha' };
export const PARAM_HASTA: ParamSpec = { id: 'hasta', label: 'Hasta', kind: 'fecha' };

/** El elemento sobre el que corre una operación de alcance individual. */
export const PARAM_OBJETIVO: ParamSpec = {
  id: 'objetivo',
  label: 'Elemento',
  kind: 'ruta',
  ayuda: 'Ruta de la pieza o del creativo, relativa a la raíz del vault.',
};

// ── precondiciones ────────────────────────────────────────────────────────────
//
// La parte que se suele omitir y la que más molesta cuando falta: si el export de
// Meta no está, el botón tiene que decirlo ANTES, no fallar a mitad. Es el mismo
// "fallar ruidoso" del resto del proyecto, corrido hacia adelante.

export type Precondicion = {
  id: string;
  /** Qué falta, en la voz de quien lo va a leer. */
  falta: string;
  /** Cómo conseguirlo. Sin esto la precondición es un "no" sin salida. */
  comoObtenerlo: string;
  cumple: () => boolean;
};

// Next carga `.env.local` en process.env para build y runtime, así que alcanza con
// mirar ahí. No se lee el valor: solo si está. `env` es inyectable para los tests.
function hayEnv(nombre: string, env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env[nombre]);
}

export const PRE_VAULTS: Precondicion = {
  id: 'vaults',
  falta: 'Alguna raíz de contenido declarada no existe en disco.',
  comoObtenerlo: 'Revisar los symlinks de ~/vaults y config/sources.json. `npm run audit` lo dice.',
  cumple: () => {
    try {
      return listSources().every((s) => s.roots.every((r) => existsSync(r)));
    } catch {
      return false; // el registro mismo no resuelve: tampoco se puede operar
    }
  },
};

export const PRE_NOTION_TOKEN: Precondicion = {
  id: 'notion-token',
  falta: 'No hay NOTION_TOKEN.',
  comoObtenerlo:
    'Es un token de integración de Notion, distinto del OAuth del MCP: notion.so/my-integrations, ' +
    'compartir la página Growth con esa integración, y ponerlo en .env.local.',
  cumple: () => hayEnv('NOTION_TOKEN'),
};

export const PRE_PYTHON: Precondicion = {
  id: 'python3',
  falta: 'No se encuentra python3.',
  comoObtenerlo: 'Los scripts de scripts/ son Python 3 de librería estándar. Instalar python3.',
  cumple: () => existsSync('/usr/bin/python3') || existsSync('/opt/homebrew/bin/python3'),
};

function preWebhook(envVar: string): Precondicion {
  return {
    id: `webhook:${envVar}`,
    falta: `No hay ${envVar}.`,
    comoObtenerlo: `Discord → canal → Integraciones → Webhooks, y la URL va a .env.local como ${envVar}.`,
    cumple: () => hayEnv(envVar),
  };
}

// ── la operación ──────────────────────────────────────────────────────────────

export type Alcance = 'lote' | 'elemento';

export type Operation = {
  id: string;
  nombre: string;
  /** Qué hace, en una línea. */
  descripcion: string;
  forma: FormaDeEjecucion;
  /** `null` = todas las marcas. Una lista = solo esas. */
  marcas: string[] | null;
  alcances: Alcance[];
  params: ParamSpec[];
  precondiciones: Precondicion[];
  /** Cada cuánto se espera que corra. Es solo para mostrar antigüedad: no agenda nada. */
  periodoDias: number | null;
  /**
   * El ejecutable que la implementa, para el contexto que recibe la sesión.
   * `argsDe` traduce los parámetros ya validados a flags: va acá, junto a la
   * operación, para que sumar una no obligue a tocar ningún componente.
   */
  implementacion?: {
    comando: string;
    args: string[];
    argsDe?: (valores: Record<string, string>) => string[];
  };
  /** Qué conviene mirar antes de aplicar. Va en la entrega. */
  queRevisar?: string[];
  /**
   * Las de etapa 2 se DECLARAN pero todavía no se ofrecen: un export lee piezas, y
   * eso necesita el parser arreglado (`footer-contract-parser`) y el aislamiento
   * por ruta (`account-scoped-routes`).
   */
  etapa: 1 | 2;
};

export const OPERACIONES: Operation[] = [
  {
    id: 'ideas-capturar',
    nombre: 'Captar una idea',
    descripcion: 'Guarda una idea en la cola local, al instante y sin red.',
    forma: 'captura',
    marcas: null,
    alcances: ['elemento'],
    params: [
      PARAM_MARCA,
      { id: 'texto', label: 'La idea', kind: 'texto', requerido: true, maxLargo: 2000 },
    ],
    // Ninguna. Una idea se capta en el momento en que aparece o se pierde: no puede
    // depender de que el destino esté accesible.
    precondiciones: [],
    periodoDias: null,
    etapa: 1,
  },
  {
    id: 'ideas-publicar',
    nombre: 'Publicar la cola de ideas',
    descripcion: 'Empuja al destino las ideas captadas que todavía no se publicaron.',
    forma: 'sesion',
    marcas: null,
    alcances: ['lote'],
    params: [PARAM_MARCA],
    precondiciones: [],
    periodoDias: 7,
    implementacion: { comando: 'node', args: ['scripts/ideas-queue.mjs', 'pendientes'] },
    queRevisar: [
      'Que cada idea vaya a la marca que declara.',
      'Marcar publicada cada una con `node scripts/ideas-queue.mjs marcar <id>`, o se vuelve a ofrecer.',
    ],
    etapa: 1,
  },
  {
    id: 'ingest-analytics',
    nombre: 'Ingerir un export de analytics',
    descripcion: 'Escribe los cortes de métricas de un CSV en el footer de cada pieza.',
    forma: 'sesion',
    marcas: null,
    alcances: ['lote'],
    params: [
      PARAM_MARCA,
      { id: 'csv', label: 'CSV del export', kind: 'ruta', requerido: true },
      { id: 'network', label: 'Red', kind: 'enum', valores: ['x', 'instagram', 'linkedin'] },
      { id: 'as-of', label: 'Fecha del corte', kind: 'fecha', ayuda: 'Por defecto sale del nombre del archivo.' },
    ],
    precondiciones: [PRE_PYTHON, PRE_VAULTS],
    periodoDias: 14,
    implementacion: {
      comando: 'python3',
      args: ['scripts/ingest-analytics.py'],
      argsDe: (v) => [
        ...(v.marca ? ['--brand', v.marca] : []),
        ...(v.csv ? ['--csv', v.csv] : []),
        ...(v.network ? ['--network', v.network] : []),
        ...(v['as-of'] ? ['--as-of', v['as-of']] : []),
      ],
    },
    queRevisar: [
      'El diff de cada footer antes de aplicar: los cortes se acumulan, nunca se pisan.',
      'Que no se escriba un campo base de métrica — el contrato los prohíbe porque envejecen.',
    ],
    etapa: 1,
  },
  {
    id: 'sync-contenido',
    nombre: 'Sincronizar contenido al tablero',
    descripcion: 'Crea y actualiza las filas del kanban de contenido desde el vault.',
    forma: 'sesion',
    marcas: null,
    alcances: ['lote', 'elemento'],
    params: [PARAM_MARCA, PARAM_MATERIA, PARAM_OBJETIVO],
    precondiciones: [PRE_PYTHON, PRE_VAULTS, PRE_NOTION_TOKEN],
    periodoDias: 7,
    implementacion: {
      comando: 'python3',
      args: ['scripts/sync-notion.py'],
      argsDe: (v) => [
        ...(v.marca ? ['--brand', v.marca] : []),
        // La dimensión propia se traduce al alcance del script, no a un canal.
        '--scope',
        v.materia === 'ads' ? 'ads' : v.materia === 'ambos' ? 'all' : 'posts',
        ...(v.objetivo ? ['--only', v.objetivo] : []),
      ],
    },
    queRevisar: [
      'Cuántas filas se crean y cuántas se actualizan.',
      'El estado con el que nace cada fila: sin señal explícita va a Backlog, nunca a "En producción".',
      'Qué estados se devuelven al vault.',
    ],
    etapa: 1,
  },
  {
    id: 'sync-documentacion',
    nombre: 'Sincronizar documentación',
    descripcion: 'Espeja como páginas del destino las carpetas de documentación declaradas.',
    forma: 'sesion',
    marcas: ['tegu'], // brain no publica documentación: notion.docs está vacío
    alcances: ['lote'],
    params: [PARAM_MARCA],
    precondiciones: [PRE_PYTHON, PRE_VAULTS, PRE_NOTION_TOKEN],
    periodoDias: 30,
    implementacion: {
      comando: 'python3',
      args: ['scripts/sync-notion-docs.py'],
      argsDe: (v) => (v.marca ? ['--brand', v.marca] : []),
    },
    queRevisar: ['Qué documentos se pisan.'],
    etapa: 1,
  },
  {
    id: 'ads-subir-creativos',
    nombre: 'Subir creativos de campañas',
    descripcion: 'Lleva los creativos de una ronda al tablero de ads.',
    forma: 'sesion',
    marcas: ['tegu'],
    alcances: ['lote', 'elemento'],
    params: [
      PARAM_MARCA,
      {
        id: 'ronda',
        label: 'Ronda',
        kind: 'texto',
        ayuda: 'El número de ronda. Sin valor = todas.',
      },
      PARAM_OBJETIVO,
    ],
    precondiciones: [PRE_PYTHON, PRE_VAULTS, PRE_NOTION_TOKEN],
    periodoDias: 30,
    implementacion: {
      comando: 'python3',
      args: ['scripts/sync-notion.py', '--scope', 'ads'],
      argsDe: (v) => [
        ...(v.marca ? ['--brand', v.marca] : []),
        ...(v.ronda ? ['--ronda', v.ronda] : []),
        ...(v.objetivo ? ['--only', v.objetivo] : []),
      ],
    },
    queRevisar: [
      'Que las dimensiones derivadas de la ruta sean las que el creativo declara.',
      'Que no entren evaluaciones, framework ni documentos de ronda: no son creativos.',
    ],
    etapa: 1,
  },
  {
    id: 'digest',
    nombre: 'Digest de growth',
    descripcion: 'Arma el resumen del estado de growth y lo postea al canal de la marca.',
    forma: 'sesion',
    marcas: ['mativallej'],
    alcances: ['lote'],
    params: [PARAM_MARCA],
    precondiciones: [PRE_PYTHON, preWebhook('DISCORD_WEBHOOK_MATIVALLEJ')],
    periodoDias: 7,
    implementacion: { comando: 'bash', args: ['scripts/cron-digest.sh'] },
    queRevisar: ['El texto del digest antes de que salga: va a un canal, no a un archivo.'],
    etapa: 1,
  },
  // ── etapa 2 ────────────────────────────────────────────────────────────────
  // Declaradas para que el catálogo esté completo, pero NO ofrecidas: un export
  // lee piezas, y hasta que no cierren footer-contract-parser y
  // account-scoped-routes no se puede garantizar ni que las lea bien ni que no
  // arrastre filas de la otra marca.
  {
    id: 'export-piezas',
    nombre: 'Exportar piezas',
    descripcion: 'Descarga las piezas que cumplen los filtros, con su cabecera de origen.',
    forma: 'export',
    marcas: null,
    alcances: ['lote'],
    params: [PARAM_MARCA, PARAM_MATERIA, PARAM_CANAL, PARAM_ESTADO, PARAM_DESDE, PARAM_HASTA],
    precondiciones: [PRE_VAULTS],
    periodoDias: null,
    etapa: 2,
  },
  {
    id: 'export-creativos',
    nombre: 'Exportar creativos',
    descripcion: 'Descarga los creativos de campañas que cumplen los filtros.',
    forma: 'export',
    marcas: ['tegu'],
    alcances: ['lote'],
    params: [PARAM_MARCA, { ...PARAM_MATERIA, porDefecto: 'ads' }, PARAM_DESDE, PARAM_HASTA],
    precondiciones: [PRE_VAULTS],
    periodoDias: null,
    etapa: 2,
  },
];

export function getOperation(id: string): Operation {
  const op = OPERACIONES.find((o) => o.id === id);
  if (!op) {
    throw new Error(
      `Operación desconocida: ${id}. Las declaradas son: ${OPERACIONES.map((o) => o.id).join(', ')}.`,
    );
  }
  return op;
}

/** Las operaciones que se ofrecen desde la vista de una marca. */
export function operacionesDeMarca(marca?: string): Operation[] {
  if (!marca) return OPERACIONES;
  return OPERACIONES.filter((o) => o.marcas === null || o.marcas.includes(marca));
}

// ── validación de parámetros ──────────────────────────────────────────────────

export type ErrorParam = { param: string; motivo: string };
export type Validacion =
  | { ok: true; valores: Record<string, string> }
  | { ok: false; errores: ErrorParam[] };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
// Una ruta de elemento: relativa, sin escaparse hacia arriba y sin metacaracteres
// de shell. No es la única defensa —los comandos se arman con argv, nunca con una
// string— pero un valor que no puede ser un path no debería llegar tan lejos.
const RUTA_RE = /^[^\0]*$/;

/**
 * Todo parámetro se valida contra lo declarado ANTES de usarse. Un valor que el
 * catálogo no admite no llega a la ejecución.
 */
export function validarParams(op: Operation, entrada: Record<string, unknown>): Validacion {
  const errores: ErrorParam[] = [];
  const valores: Record<string, string> = {};

  for (const clave of Object.keys(entrada)) {
    if (!op.params.some((p) => p.id === clave)) {
      errores.push({ param: clave, motivo: `La operación "${op.id}" no declara este parámetro.` });
    }
  }

  for (const spec of op.params) {
    const crudo = entrada[spec.id];
    const vacio = crudo === undefined || crudo === null || crudo === '';

    if (vacio) {
      if (spec.porDefecto !== undefined) valores[spec.id] = spec.porDefecto;
      else if (spec.requerido) errores.push({ param: spec.id, motivo: `Falta "${spec.label}", que es obligatorio.` });
      continue;
    }

    if (typeof crudo !== 'string') {
      errores.push({ param: spec.id, motivo: 'Tiene que ser texto.' });
      continue;
    }
    const v = crudo.trim();

    if (spec.kind === 'enum' && !spec.valores.includes(v)) {
      errores.push({
        param: spec.id,
        motivo: `"${v}" no está declarado. Los valores válidos son: ${spec.valores.join(', ')}.`,
      });
      continue;
    }
    if (spec.kind === 'fecha' && !FECHA_RE.test(v)) {
      errores.push({ param: spec.id, motivo: `"${v}" no es una fecha AAAA-MM-DD.` });
      continue;
    }
    if (spec.kind === 'ruta') {
      if (!RUTA_RE.test(v) || v.startsWith('/') || v.split('/').includes('..')) {
        errores.push({ param: spec.id, motivo: 'Tiene que ser una ruta relativa, sin salir hacia arriba.' });
        continue;
      }
    }
    if (spec.kind === 'texto' && spec.maxLargo && v.length > spec.maxLargo) {
      errores.push({ param: spec.id, motivo: `No puede pasar de ${spec.maxLargo} caracteres.` });
      continue;
    }
    valores[spec.id] = v;
  }

  // Una operación declarada para una marca no se dispara desde otra.
  if (op.marcas && valores.marca && !op.marcas.includes(valores.marca)) {
    errores.push({
      param: 'marca',
      motivo: `"${op.nombre}" solo aplica a: ${op.marcas.join(', ')}.`,
    });
  }

  return errores.length ? { ok: false, errores } : { ok: true, valores };
}

// ── evaluación de precondiciones ──────────────────────────────────────────────

export type Faltante = { id: string; falta: string; comoObtenerlo: string };
export type Disponibilidad = {
  disparable: boolean;
  faltantes: Faltante[];
  /** Motivo por el que no se ofrece aunque las precondiciones se cumplan. */
  bloqueo?: string;
};

/** Se evalúa al PRESENTAR el catálogo, no al ejecutar. */
export function evaluar(op: Operation): Disponibilidad {
  const faltantes = op.precondiciones
    .filter((p) => !p.cumple())
    .map((p) => ({ id: p.id, falta: p.falta, comoObtenerlo: p.comoObtenerlo }));

  if (op.etapa === 2) {
    return {
      disparable: false,
      faltantes,
      bloqueo:
        'Etapa 2: un export lee piezas. Espera a `footer-contract-parser` y a `account-scoped-routes`.',
    };
  }
  return { disparable: faltantes.length === 0, faltantes };
}
