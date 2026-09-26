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
