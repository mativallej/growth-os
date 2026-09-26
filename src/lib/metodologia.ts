import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSource } from './sources';

// EL MÉTODO: qué pasos tiene, qué hace cada uno y con qué.
//
// Las FASES son doctrina — no se pueden derivar de nada, porque son justamente
// lo que se decidió. Las SKILLS se leen del vault: son ~48 entre los tres
// repos, cambian todo el tiempo, y una lista escrita a mano sería lo primero en
// quedar vieja.
//
// Cada fase declara además DÓNDE vive y qué hace la plataforma ahí, que casi
// siempre es "nada". El método es de Obsidian; esta app entra en dos pasos —
// captar la idea y medir— y en ningún otro. Ver la regla dura 7.

export type Fase = {
  id: string;
  /** El paso, en un verbo. */
  nombre: string;
  /** Qué pasa en este paso. */
  que: string;
  /** Dónde ocurre. */
  donde: 'vault' | 'plataforma' | 'la red' | 'coordinación';
  /** Prefijos de skill que corresponden a esta fase. */
  prefijos: string[];
  /**
   * Prioridad de MATCHEO, independiente del orden de lectura.
   *
   * `growth-evaluar-post` contiene "post" y contiene "evaluar": sin una
   * prioridad, la fase que se evalúe primero se lo lleva, y "Escribir" viene
   * antes que "Evaluar" en el método. Más chico = gana.
   */
  prioridad: number;
  /** Qué hace la plataforma acá. `null` cuando no le toca nada. */
  plataforma: string | null;
  /** El error típico de saltearse este paso. */
  siSeSaltea: string;
};

export const FASES: Fase[] = [
  {
    id: 'captar',
    prioridad: 5,
    nombre: 'Captar',
    que: 'Una idea entra. Cruda, sin formato, antes de que se pierda.',
    donde: 'plataforma',
    prefijos: ['idea'],
    plataforma:
      'La captura de ideas. Es la ÚNICA escritura de contenido que la plataforma ' +
      'admite, y es a propósito: una idea es materia prima, no trabajo creativo.',
    siSeSaltea: 'La idea se pierde. Es el paso más barato y el que más se saltea.',
  },
  {
    id: 'investigar',
    prioridad: 4,
    nombre: 'Investigar',
    que: 'El research que respalda la pieza: competencia, mercado, el dato duro.',
    donde: 'vault',
    prefijos: ['research', 'nota-atomica', 'atomic', 'extract', 'bibliography', 'reference'],
    plataforma: null,
    siSeSaltea: 'La pieza afirma cosas que no puede sostener, y eso se nota.',
  },
  {
    id: 'escribir',
    prioridad: 9,
    nombre: 'Escribir',
    que: 'La pieza, con su fórmula, su footer y su carpeta.',
    donde: 'vault',
    prefijos: ['post', 'ads-creativo', 'ads-ronda', 'voice', 'format-first', 'image-select'],
    plataforma:
      'Nada. Acá NO se escribe ni se edita el cuerpo de una pieza: eso es Obsidian, ' +
      'con sus skills de voz. Sin esta frontera la plataforma termina siendo un ' +
      'editor peor que el que ya hay.',
    siSeSaltea: 'No hay pieza.',
  },
  {
    id: 'evaluar',
    prioridad: 2,
    nombre: 'Evaluar',
    que: 'El gate antes de publicar: honestidad, voz, fit, calidad. Veredicto y fixes.',
    donde: 'vault',
    prefijos: ['evaluar', 'evaluation', 'publish-gate', 'viral'],
    plataforma: null,
    siSeSaltea:
      'Sale algo que no debería. Es el paso que existe para que la evaluación ' +
      'quede escrita ANTES del resultado, y no se acomode después.',
  },
  {
    id: 'publicar',
    prioridad: 8,
    nombre: 'Publicar',
    que: 'La pieza sale. A mano, en la red.',
    donde: 'la red',
    prefijos: [],
    plataforma:
      'Nada, y es una decisión: un publicador externo se descartó (D-3). Lo que ' +
      'sí hace es dejar registrada la url, que es la llave con la que después se mide.',
    siSeSaltea: 'No hay nada que medir.',
  },
  {
    id: 'coordinar',
    prioridad: 3,
    nombre: 'Coordinar',
    que: 'Quién hace qué, en qué carril, con qué fecha.',
    donde: 'coordinación',
    prefijos: ['notion-sync'],
    plataforma:
      'Prepara el sync y lo entrega a una sesión local. El vault decide con qué ' +
      'estado NACE una fila; el tablero manda de ahí en adelante.',
    siSeSaltea: 'Dos personas escriben la misma pieza.',
  },
  {
    id: 'medir',
    prioridad: 3,
    nombre: 'Medir',
    que: 'Los números de la pieza publicada, por horizonte, en su footer.',
    donde: 'vault',
    prefijos: ['analytics'],
    plataforma:
      'Prepara la ingesta de un export y muestra la deuda: qué se publicó y ' +
      'todavía nadie midió, ordenado por hace cuánto.',
    siSeSaltea:
      'La deuda de medición. Es el agujero que la vista de Deuda existe para ' +
      'mostrar, y hoy es el más grande del sistema.',
  },
  {
    id: 'aprender',
    prioridad: 1,
    nombre: 'Aprender',
    que: 'Qué funcionó, qué no, y por qué. Al learning log del canal.',
    donde: 'vault',
    prefijos: ['digest', 'learning-log', 'wbr', 'wgr', 'measure-archive'],
    plataforma:
      'Cruza todo contra el catálogo: cadencia contra la dieta, fórmulas sin ' +
      'estrenar, ranking en absoluto y en tasa. Es lo único que ninguna de las ' +
      'otras dos capas puede hacer.',
    siSeSaltea:
      'El loop no cierra. Se publica mucho y no se aprende nada — que es ' +
      'exactamente el estado que este proyecto existe para salir.',
  },
];

export type Skill = {
  nombre: string;
  descripcion: string;
  /** El vault donde vive. */
  vault: string;
};

/** `description:` del frontmatter, hasta el primer punto que cierra la idea. */
function descripcionDe(texto: string): string {
  const m = texto.match(/^description:\s*([\s\S]*?)\n(?:[a-z_-]+:|---)/m);
  const cruda = (m?.[1] ?? '').replace(/\s+/g, ' ').trim();
  // Las descripciones traen "Usar cuando el usuario diga…", que es para el
  // ruteo de la skill y no aporta acá.
  const corte = cruda.search(/\s(Usar cuando|Se usa cuando)\b/i);
  return (corte > 0 ? cruda.slice(0, corte) : cruda).trim();
}

/**
 * Las skills de un vault, leídas de `.claude/skills/`.
 *
 * Solo del vault de la marca que se está mirando: las de la otra no se leen, ni
 * siquiera para contarlas. Es la misma frontera que el resto de la app.
 */
export function skillsDe(brand: string, env: NodeJS.ProcessEnv = process.env): Skill[] {
  let dir: string;
  try {
    dir = join(getSource(brand === 'mativallej' ? 'personal' : 'tegu', env).vault, '.claude/skills');
  } catch {
    return [];
  }
  if (!existsSync(dir)) return [];

  const out: Skill[] = [];
  try {
    for (const nombre of readdirSync(dir).sort()) {
      const skill = join(dir, nombre, 'SKILL.md');
      if (!existsSync(skill)) continue;
      out.push({
        nombre,
        descripcion: descripcionDe(readFileSync(skill, 'utf8')),
        vault: brand,
      });
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * Reparte las skills entre las fases por su nombre.
 *
 * Una skill que no matchea ninguna fase NO se esconde: va a "sin fase", que es
 * información — o falta una fase en el método, o la skill hace algo que el
 * método no contempla. Las dos cosas vale la pena verlas.
 */
export function porFase(skills: Skill[]): {
  fases: (Fase & { skills: Skill[] })[];
  sinFase: Skill[];
} {
  const asignadas = new Map<string, string>();

  // Se MATCHEA por prioridad y se MUESTRA en el orden del método. Son dos cosas
  // distintas: `evaluar-post` pertenece a Evaluar aunque Escribir venga antes.
  for (const f of [...FASES].sort((a, b) => a.prioridad - b.prioridad)) {
    for (const s of skills) {
      if (asignadas.has(s.nombre)) continue;
      const corto = s.nombre.replace(/^(brain|growth|tegu)-/, '');
      if (f.prefijos.some((p) => corto.startsWith(p) || corto.includes('-' + p))) {
        asignadas.set(s.nombre, f.id);
      }
    }
  }

  const fases = FASES.map((f) => ({
    ...f,
    skills: skills.filter((s) => asignadas.get(s.nombre) === f.id),
  }));
  return { fases, sinFase: skills.filter((s) => !asignadas.has(s.nombre)) };
}
