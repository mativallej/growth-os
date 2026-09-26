import type { Piece } from './types';
import type { Channel } from './normalize';

// EL ENLACE RASTREABLE DE UNA PIEZA. La convención está en docs/attribution.md;
// acá solo se construye.
//
// Función pura y determinista: dos llamadas con la misma pieza dan el mismo
// enlace. Eso importa más de lo que parece — un enlace rastreable YA PUBLICADO
// no se puede corregir, vive en un tweet de hace ocho meses. Si su `utm_content`
// dejara de corresponder con la pieza, el dato no se rompería: MENTIRÍA, y
// apuntaría a otra.
//
// Por eso se llavea por el `id` del footer (D-9) y no por el slug: el slug sale
// de la ruta, y la ruta cambia.

export type Atribucion =
  | { atribuible: true; clave: string; url: string; deId: boolean }
  | { atribuible: false; motivo: string };

/** `utm_source`. El canal normalizado, que ya es un conjunto cerrado. */
function fuenteDe(channel: Channel): string {
  return channel === 'unknown' ? '' : channel;
}

/**
 * El enlace rastreable de una pieza hacia un destino propio.
 *
 * Devuelve `atribuible: false` con el motivo cuando no se puede construir. NO
 * devuelve un enlace a medias: un enlace sin `utm_content` identifica el canal y
 * no la pieza, que es exactamente el error que el research señala — sirve para
 * decir "LinkedIn trajo 12" y no para decir cuál post.
 */
export function enlaceRastreable(
  piece: Pick<Piece, 'id' | 'slug' | 'channel' | 'source'>,
  destino: string,
): Atribucion {
  const base = destino.trim();
  if (!base) {
    return { atribuible: false, motivo: 'No hay destino propio al que enlazar.' };
  }

  const fuente = fuenteDe(piece.channel);
  if (!fuente) {
    return {
      atribuible: false,
      motivo: 'La pieza no declara canal, así que no se puede decir de dónde vino el clic.',
    };
  }

  // El `id` es la llave buena; el slug es el respaldo mientras el backfill no
  // haya corrido. Un enlace hecho con slug queda impreso con una llave que
  // puede envejecer, y eso se marca para poder contarlo.
  const clave = piece.id ?? piece.slug;
  if (!clave) {
    return { atribuible: false, motivo: 'La pieza no tiene identificador.' };
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return { atribuible: false, motivo: `El destino "${base}" no es una dirección válida.` };
  }

  url.searchParams.set('utm_source', fuente);
  url.searchParams.set('utm_medium', 'organico');
  url.searchParams.set('utm_campaign', piece.source);
  url.searchParams.set('utm_content', clave);

  return { atribuible: true, clave, url: url.toString(), deId: Boolean(piece.id) };
}

/**
 * Las claves de atribución tienen que ser ÚNICAS en todo el corpus.
 *
 * Dos piezas con la misma clave hacen que un registro se atribuya a cualquiera
 * de las dos, y no hay forma de saber a cuál. Se reportan las rutas, igual que
 * con los ids repetidos: elegir una en silencio es peor que no atribuir.
 */
export function clavesRepetidas(pieces: Piece[]): { clave: string; paths: string[] }[] {
  const por = new Map<string, string[]>();
  for (const p of pieces) {
    const clave = p.id ?? p.slug;
    if (!clave) continue;
    por.set(clave, [...(por.get(clave) ?? []), p.relPath]);
  }
  return [...por.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([clave, paths]) => ({ clave, paths: paths.sort() }))
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

/** Estado de una señal: se está midiendo, o el circuito está abierto. */
export type EstadoSenal =
  | { disponible: true; valor: number }
  | { disponible: false; motivo: string; falta: string };

export type Senales = {
  clic: EstadoSenal;
  autoReportada: EstadoSenal;
  serieTemporal: EstadoSenal;
};

/**
 * Las tres señales, con su estado.
 *
 * NINGUNA SE PRESENTA SOLA, y ninguna no disponible se muestra como cero. Esa
 * es la distinción que más fácil se rompe y más caro sale: un cero en una vista
 * de atribución, cuando en realidad el circuito está abierto, es la clase de
 * número que hace cancelar un canal que funcionaba.
 *
 * Hoy las tres están abiertas: el producto todavía no emite nada. La función
 * existe igual para que la vista tenga qué decir —y para que el día que una se
 * cierre, el lugar donde enchufarla esté escrito.
 */
export function senales(): Senales {
  return {
    clic: {
      disponible: false,
      motivo: 'El producto todavía no persiste el origen de un registro.',
      falta: 'Guardar primer y último toque por separado, y emitirlos con el registro.',
    },
    autoReportada: {
      disponible: false,
      motivo: 'No existe el campo de "¿cómo nos conociste?" en el post-registro.',
      falta:
        'Un campo abierto y opcional. Es lo más barato de toda la lista y lo único ' +
        'que ve el boca a boca — el WhatsApp, que hoy es completamente invisible.',
    },
    serieTemporal: {
      disponible: false,
      motivo: 'No hay serie de registros ni de tráfico directo contra la que cruzar.',
      falta: 'Un export periódico de registros por día.',
    },
  };
}

/** true si ninguna señal está disponible: el circuito está abierto de punta a punta. */
export function circuitoAbierto(s: Senales = senales()): boolean {
  return !s.clic.disponible && !s.autoReportada.disponible && !s.serieTemporal.disponible;
}
