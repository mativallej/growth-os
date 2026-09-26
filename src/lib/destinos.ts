import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';

// LOS DESTINOS DEL WORKSPACE DE COORDINACIÓN, en un solo lugar.
//
// Estaban hardcodeados en `scripts/sync-notion.py` y `sync-notion-docs.py`, cada
// uno con su copia. Dos copias de un identificador es una que se va a quedar
// vieja, y además son exactamente lo que `public-release` tiene que sacar del
// código antes de abrir el repo: un id de workspace no es un secreto, pero es
// una dirección de la casa de alguien.
//
// La app los lee para ofrecer los accesos; los scripts, para consultar. Si uno
// no tiene `url`, NO SE OFRECE — un acceso a un destino que no está configurado
// es un enlace muerto, y un enlace muerto es peor que no tener el acceso.

export type Destino = {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'data_source' | 'page';
  ref: string;
  url?: string;
  /** `null` = todas las marcas. */
  marcas: string[] | null;
};

let cache: Destino[] | null = null;

export function destinos(): Destino[] {
  if (cache) return cache;
  try {
    const raw = readFileSync(join(repoRoot(), 'config/destinos.json'), 'utf8');
    const parsed = JSON.parse(raw) as { destinos?: Destino[] };
    cache = parsed.destinos ?? [];
  } catch {
    // Sin config no hay accesos, y eso está bien: la app funciona igual. No es
    // como un vault ausente, que invalida todo lo que se muestra.
    cache = [];
  }
  return cache;
}

/** Solo para tests: la config se cachea por proceso. */
export function resetDestinosCache(): void {
  cache = null;
}

/**
 * Los destinos que una marca puede abrir, ya filtrados por los que tienen
 * dirección configurada.
 */
export function destinosDe(brand: string): Destino[] {
  return destinos().filter(
    (d) => Boolean(d.url) && (d.marcas === null || d.marcas.includes(brand)),
  );
}

export function destinoPorId(id: string): Destino | undefined {
  return destinos().find((d) => d.id === id);
}
