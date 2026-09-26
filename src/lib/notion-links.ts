import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './repo';

// DE UNA PIEZA A SU FILA EN EL TABLERO.
//
// El puente conoce el identificador de la fila en el momento de crearla y lo
// descartaba. Sin eso, ir de una pieza a su fila es abrir Notion y buscar por
// título — esperando que el título no se haya renombrado.
//
// La correspondencia la escribe el sync —`scripts/sync-notion.py` de
// tegu-labs/tegu-growth— en `.state/`, que es
// estado LOCAL y derivado: si se borra, la app sigue funcionando y lo único que
// se pierde son los enlaces. No es una fuente de verdad, y por eso no se
// commitea ni se sincroniza.
//
// Se llavea por lo mismo que llavea el puente: el `id` de la pieza (D-9). Antes
// era la ruta, y la ruta cambia — es lo que dejó 57 filas apuntando al vacío.

export type Correspondencia = {
  /** ISO de cuándo se actualizó, para poder mostrar la antigüedad. */
  actualizado: string;
  /** clave de pieza -> identificador de la fila. */
  filas: Record<string, string>;
};

export type EstadoEnlaces = {
  correspondencia: Correspondencia | null;
  /** Días desde la última actualización. `null` si nunca se escribió. */
  dias: number | null;
};

function archivo(brand: string, dir: string): string {
  return join(dir, `notion-links-${brand}.json`);
}

export function leerCorrespondencia(
  brand: string,
  ahora = new Date(),
  dir = stateDir(),
): EstadoEnlaces {
  try {
    const c = JSON.parse(readFileSync(archivo(brand, dir), 'utf8')) as Correspondencia;
    if (!c?.filas || typeof c.filas !== 'object') return { correspondencia: null, dias: null };
    const t = Date.parse(c.actualizado ?? '');
    return {
      correspondencia: c,
      dias: Number.isNaN(t) ? null : Math.floor((ahora.getTime() - t) / 86_400_000),
    };
  } catch {
    // No existe o está ilegible: son lo mismo — todavía no se sincronizó.
    return { correspondencia: null, dias: null };
  }
}

/**
 * El enlace de una pieza, o `null` si no tiene fila conocida.
 *
 * `null` NO significa que la pieza no esté en el tablero: significa que esta
 * app no sabe cuál es su fila. La diferencia importa, y la vista la dice con
 * esas palabras — afirmar "no está sincronizada" sería afirmar de más.
 */
export function enlaceDePieza(
  piece: { id?: string; relPath: string },
  correspondencia: Correspondencia | null,
): string | null {
  if (!correspondencia) return null;
  const clave = piece.id ?? piece.relPath;
  const fila = correspondencia.filas[clave];
  if (!fila) return null;
  return `https://www.notion.so/${fila.replace(/-/g, '')}`;
}
