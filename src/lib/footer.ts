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

/**
 * UNA PUBLICACIÓN DE LA PIEZA EN UNA CUENTA.
 *
 * El vault escribe un bloque así, y no una clave `url:` suelta:
 *
 *     distribucion:
 *       - ig_tegu    url=https://www.instagram.com/reel/DXaC/  date=2026-04-21
 *       - blog_tegu  url=https://tegu.ar/building-in-public/x
 *       - blog_mati  date=2026-09-10
 *
 * Y tiene razón en hacerlo: UNA PIEZA SE PUBLICA EN VARIOS LADOS —es lo que el
 * vault llama cross-post— y cada lado tiene su propia dirección y su propia
 * fecha. Una sola clave `url:` obliga a elegir una y perder el resto.
 *
 * Una entrada puede traer solo la cuenta: significa "se publicó acá y todavía no
 * se registró dónde". Es distinto de no estar en la lista.
 */
export type Distribucion = {
  /** id de cuenta, el mismo de `accounts[]` en config/sources.json. */
  cuenta: string;
  url?: string;
  date?: string;
};

export type FooterFields = {
  /** clave canónica -> primer valor visto (gana el primero, como en el script de Python) */
  fields: Record<string, string>;
  /** líneas que parecían clave:valor pero con clave fuera del vocabulario */
  unknownKeys: string[];
  /** líneas del bloque `analytics:` y cortes sueltos, sin interpretar todavía */
  snapshotLines: string[];
  /** valor crudo de `analytics:` cuando es una palabra y no un bloque (`pendiente`) */
  analyticsNote?: string;
  /** dónde se publicó la pieza, una entrada por cuenta. Ver `Distribucion`. */
  distribucion: Distribucion[];
};

/**
 * Una línea del bloque: `ig_tegu  url=https://…  date=2026-04-21`.
 *
 * El primer token es la cuenta y el resto son pares `clave=valor`. Se parte por
 * el PRIMER `=` de cada token y no por todos: una url lleva `=` adentro cuando
 * tiene query string, y partir por todos la cortaría a la mitad.
 */
function parseDistribucion(linea: string): Distribucion | undefined {
  const partes = linea.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return undefined;
  const cuenta = partes[0];
  // Una "cuenta" con `=` adentro no es una cuenta: es una línea con otra forma,
  // y adivinarla inventaría una publicación que nadie declaró.
  if (!cuenta || cuenta.includes('=')) return undefined;

  const out: Distribucion = { cuenta };
  for (const t of partes.slice(1)) {
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).toLowerCase();
    const v = t.slice(i + 1);
    if (!v) continue;
    if (k === 'url') out.url = v;
    else if (k === 'date' || k === 'fecha') out.date = v;
  }
  return out;
}

/**
 * Recorre las líneas de un footer y devuelve sus campos.
 *
 * El toggle de fence importa: 10 archivos del vault personal traen prompts de
 * Claude Design en bloques ``` cuyo contenido tiene líneas con forma de
 * `clave: valor`. Sin el toggle, esas líneas entran como metadatos.
 */
const isBulletDe = (raw: string) => /^\s*[-*]\s+/.test(raw);

export function tokenizeFooter(lines: string[]): FooterFields {
  const fields: Record<string, string> = {};
  const unknownKeys: string[] = [];
  const snapshotLines: string[] = [];
  let analyticsNote: string | undefined;
  let inFence = false;
  let inAnalytics = false;
  let inDistribucion = false;
  const distribucion: Distribucion[] = [];

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

    // `distribucion:` abre un bloque de publicaciones, una por línea.
    //
    // Va ANTES del parseo genérico porque sus líneas no tienen forma de
    // `clave: valor`: son `cuenta  url=…  date=…`. Pasando por el parseo
    // genérico, `https://…` matchearía como si `https` fuera una clave y la url
    // se perdía entera — que es exactamente lo que estaba pasando: 128 de 141
    // piezas tenían su dirección acá y el parser leía cero.
    if (/^distribuci[oó]n\s*:\s*$/i.test(line)) {
      inDistribucion = true;
      continue;
    }
    if (inDistribucion) {
      if (isBulletDe(raw)) {
        const d = parseDistribucion(line);
        if (d) distribucion.push(d);
        continue;
      }
      // Una línea que no es un ítem cierra el bloque, y sigue su camino normal.
      inDistribucion = false;
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

  // `url` sale de la distribución cuando no vino como clave suelta: el resto del
  // sistema —el ingest, la atribución, el enlace de la vista— la busca ahí. Se
  // toma la PRIMERA que tenga dirección, que es el orden en que el vault las
  // escribe. Las demás no se pierden: viajan en `distribucion`.
  if (fields.url === undefined) {
    const con = distribucion.find((d) => d.url);
    if (con?.url) fields.url = con.url;
  }

  return { fields, unknownKeys, snapshotLines, analyticsNote, distribucion };
}
