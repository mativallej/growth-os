// UN ENLACE QUE VIENE DE UN .md NO ES CONFIABLE HASTA QUE SE MIRA.
//
// Los valores del footer los escribe una persona en un archivo de texto, y la app
// los pone en un `href`. Un `javascript:` ahí ejecuta código al hacer click, y un
// `data:` puede servir una página entera. Nada de eso es hipotético: es el camino
// más corto entre "un campo de texto libre" y "ejecución en el navegador de quien
// mira el tablero".
//
// La regla es blanca, no negra: solo `http:` y `https:` pasan. Una lista de
// esquemas prohibidos se queda corta con el próximo que aparezca.

/** `true` solo si es una URL absoluta http(s) bien formada. */
export function esHttp(valor: string | undefined | null): boolean {
  if (!valor) return false;
  try {
    const u = new URL(valor.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    // No parsea: puede ser una ruta relativa, una nota, o basura. En los tres
    // casos no se linkea.
    return false;
  }
}

/** El host, para mostrar de dónde es un enlace sin repetir la URL entera. */
export function hostDe(valor: string): string {
  try {
    return new URL(valor.trim()).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * A qué red apunta un enlace, para poder decir "Ver en TikTok" y no "Ver en
 * tiktok.com".
 *
 * SE DERIVA DEL HOST Y NO DEL CANAL de la pieza, a propósito. `Channel` es un
 * conjunto cerrado —x, instagram, linkedin, blog, reddit— que usa la
 * normalización de métricas, y sumarle valores tiene consecuencias ahí: cada
 * canal define qué columna es "alcance". Pero una pieza puede estar publicada en
 * TikTok o en YouTube igual, y su `url` lo dice sin ambigüedad.
 *
 * Lo que NO se hace es inventar: un host que no está en la lista se muestra tal
 * cual. "Ver en substack.com" es honesto; "Ver en Blog" sería una etiqueta que
 * nadie declaró.
 */
const REDES: [RegExp, string][] = [
  [/^(.*\.)?(x|twitter)\.com$/, 'X'],
  [/^(.*\.)?instagram\.com$/, 'Instagram'],
  [/^(.*\.)?tiktok\.com$/, 'TikTok'],
  [/^(.*\.)?(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/^(.*\.)?linkedin\.com$/, 'LinkedIn'],
  [/^(.*\.)?reddit\.com$/, 'Reddit'],
  [/^(.*\.)?threads\.(net|com)$/, 'Threads'],
  [/^(.*\.)?facebook\.com$/, 'Facebook'],
  [/^(.*\.)?drive\.google\.com$/, 'Drive'],
];

export function redDeUrl(url: string): string {
  const host = hostDe(url);
  if (!host) return '';
  for (const [re, nombre] of REDES) if (re.test(host)) return nombre;
  return host;
}
