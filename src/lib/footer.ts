// Tokenizer de footer. Entiende LAS DOS GRAMÁTICAS del proyecto, que son las dos
// legítimas y conviven incluso dentro del mismo archivo:
//
//   bullet   `- platform: Instagram`              (vault personal)
//   inline   `canal: Twitter · cuenta: x_mati`    (vault de Tegu)
//
// Un lector que entienda solo una ve 14 piezas donde hay 95. Ya pasó el
// 2026-09-24 en el sync y está arreglado ahí; el vocabulario de claves de este
// archivo es el mismo (constante CLAVES), a propósito.
//
// ⚠️  ESE ESPEJO AHORA CRUZA DOS REPOSITORIOS. El sync se mudó a
// `tegu-labs/tegu-growth` el 2026-09-26 —el disparador es que cambió el
// contenido, y el contenido está allá— así que `CLAVES` y `AD_CLAVES` viven en
// `scripts/sync-notion.py` de ESE repo.
//
// Agregar una clave al contrato del footer es tocar LOS DOS. Si solo se toca uno:
// el dashboard la muestra y el tablero la ignora, o al revés — y ninguno de los
// dos falla, que es lo peor que puede pasar. Los tests del contrato también
// viven allá (`scripts/test_sync_notion.py`).

/** Claves conocidas -> nombre canónico. Espejo de `CLAVES` en el sync (otro repo, ver arriba). */
export const KNOWN_KEYS: Record<string, string> = {
  // La identidad de la pieza (D-9). Se lee, nunca se genera al leer: un id
  // inventado en lectura sería distinto en cada build y peor que no tenerlo.
  id: 'id',
  status: 'status',
  estado: 'status',
  url: 'url',
  link: 'url',
  // El MASTER del video en Drive, que no es lo mismo que `url`: `url` es dónde se
  // publicó y es la llave del ingest; esto es dónde está el archivo con el que se
  // publicó. Una pieza puede tener el archivo y no estar publicada todavía.
  drive_url: 'drive_url',
  drive: 'drive_url',
  date: 'date',
  fecha: 'date',
  canal: 'platform',
  platform: 'platform',
  red: 'platform',
  formato: 'formato',
  format: 'formato',
  'fórmula': 'formula',
  formula: 'formula',
  cuenta: 'account',
  account: 'account',
  notas: 'notas',
  notes: 'notas',
  tags: 'tags',
  analytics: 'analytics',
  // Claves de análisis del porqué (skill x-analytics-ingest)
  verdict: 'verdict',
  veredicto: 'verdict',
  drivers: 'drivers',
  why: 'why',
  lesson: 'lesson',
  note: 'note',
};

/** Claves de ads. Espejo de `AD_CLAVES` en el sync (otro repo, ver arriba). */
export const AD_KEYS: Record<string, string> = {
  'buyer persona': 'persona',
  persona: 'persona',
  'público': 'publico',
  publico: 'publico',
  dolor: 'dolor',
  'ángulo': 'angulo',
  angulo: 'angulo',
  ronda: 'ronda',
  cta: 'cta',
  creativo: 'creativo',
  formato: 'formato',
};

/** Métricas que el vault personal escribe como bullets sueltos de primer nivel. */
export const METRIC_KEYS = new Set([
  'impressions', 'likes', 'views', 'reach', 'bookmarks', 'reposts', 'replies',
  'engagements', 'saves', 'comments', 'shares', 'follows', 'new_follows',
  'profile_visits', 'detail_expands', 'nonfoll',
]);

const KEY_RE = /^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ_][A-Za-zÁÉÍÓÚÜÑáéíóúüñ_ -]{0,24}?)\s*:\s*(.*)$/;

export function canonicalKey(raw: string): string | undefined {
  const k = raw.trim().toLowerCase();
  return KNOWN_KEYS[k] ?? AD_KEYS[k] ?? (METRIC_KEYS.has(k) ? k : undefined);
}

/**
 * Parte una línea inline por ` · `, PERO SOLO en los límites donde lo que sigue
 * es una clave conocida.
 *
 * Es la diferencia entre leer bien y romper datos. El vault escribe:
 *
 *   fórmula: X2 · Antagonista (el footer decía: antagonista (citas→hechos))
 *
 * Partir por ` · ` a ciegas deja `fórmula: "X2"` y tira el resto — que es lo que
 * hacía el parser hasta este change. El mismo carácter es separador en
 * `canal: Twitter · cuenta: x_mati` y contenido en la línea de arriba; lo único
 * que los distingue es si el segmento siguiente abre una clave del vocabulario.
 */
export function splitInline(line: string): string[] {
  const parts = line.split(' · ');
  if (parts.length === 1) return parts;
  const out: string[] = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(KEY_RE);
    if (m && canonicalKey(m[1])) {
      out.push(parts[i]);
    } else {
      // No abre clave conocida: es continuación del valor anterior.
      out[out.length - 1] += ' · ' + parts[i];
    }
  }
  return out;
}

export type FooterFields = {
  /** clave canónica -> primer valor visto (gana el primero, como en el script de Python) */
  fields: Record<string, string>;
  /** líneas que parecían clave:valor pero con clave fuera del vocabulario */
  unknownKeys: string[];
  /** líneas del bloque `analytics:` y cortes sueltos, sin interpretar todavía */
  snapshotLines: string[];
  /** valor crudo de `analytics:` cuando es una palabra y no un bloque (`pendiente`) */
  analyticsNote?: string;
};

/**
 * Recorre las líneas de un footer y devuelve sus campos.
 *
 * El toggle de fence importa: 10 archivos del vault personal traen prompts de
 * Claude Design en bloques ``` cuyo contenido tiene líneas con forma de
 * `clave: valor`. Sin el toggle, esas líneas entran como metadatos.
 */
export function tokenizeFooter(lines: string[]): FooterFields {
  const fields: Record<string, string> = {};
  const unknownKeys: string[] = [];
  const snapshotLines: string[] = [];
  let analyticsNote: string | undefined;
  let inFence = false;
  let inAnalytics = false;

  const put = (k: string, v: string) => {
    if (fields[k] === undefined) fields[k] = v;
  };

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!trimmed) continue;

    // Quita bullet de lista y negritas de markdown, sin tocar el resto.
    const line = trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, '');

    // Un corte, venga suelto o dentro del bloque `analytics:`.
    //
    // La tercera alternativa cubre la prosa fechada SIN bloque que la contenga
    // (`- 2026-07-17 +3min: 13 imp · 11 eng`). Una clave de metadato empieza con
    // letra, así que una línea que empieza con fecha ISO y termina el encabezado
    // en `:` solo puede ser un corte — y antes caía al parseo genérico, donde
    // `2026-07-17 +3min` no matchea como clave y la medición se perdía entera.
    if (
      /^snapshot\s/i.test(line) ||
      /^t=/.test(line) ||
      /^\d{4}-\d{2}-\d{2}\s+\S+\s*:/.test(line) ||
      (inAnalytics && /^\d{4}-\d{2}-\d{2}/.test(line))
    ) {
      snapshotLines.push(line);
      continue;
    }

    // `analytics:` abre un bloque de cortes, o trae una nota (`pendiente`).
    const am = line.match(/^analytics\s*:\s*(.*)$/i);
    if (am) {
      inAnalytics = true;
      if (am[1].trim()) analyticsNote = am[1].trim();
      continue;
    }

    // Una línea de bullet trae UNA clave; una inline puede traer varias.
    const isBullet = /^[-*]\s+/.test(trimmed);
    const segments = isBullet ? [line] : splitInline(line);

    let matchedAny = false;
    for (const seg of segments) {
      const m = seg.trim().match(KEY_RE);
      if (!m) continue;
      const canon = canonicalKey(m[1]);
      if (canon) {
        matchedAny = true;
        const val = m[2].trim();
        // Una clave presente con valor vacío es señal: "esto se mide y todavía
        // no se midió". Se registra igual, para distinguirla de la ausencia.
        put(canon, val);
      } else {
        unknownKeys.push(m[1].trim().toLowerCase());
      }
    }

    // Una línea que no abrió ninguna clave cierra el bloque de analytics.
    if (!matchedAny && inAnalytics && !/^\s/.test(raw)) inAnalytics = false;
  }

  return { fields, unknownKeys, snapshotLines, analyticsNote };
}
