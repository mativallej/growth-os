import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';

// LA DIETA DE PUBLICACIÓN: cuántas piezas por mes se propone esta marca.
//
// NO es un default de la app y no se infiere de la historia. Es criterio del
// humano —cuánto se propone publicar— y la app solo lo compara contra lo que
// pasó. Derivarlo del promedio de los últimos meses sería el error clásico:
// convertir lo que viene pasando en el objetivo, con lo cual nunca se está mal.
//
// Se declara por marca en config/sources.json y se puede reapuntar por entorno
// sin tocar el repo, igual que la ruta del vault.

export type Dieta = { piso: number; techo: number };

const POR_DEFECTO: Dieta = { piso: 10, techo: 14 };

type BrandConfig = { id: string; growth?: { cadencia?: Partial<Dieta> } };

function marcas(): BrandConfig[] {
  try {
    const raw = readFileSync(join(repoRoot(), 'config/sources.json'), 'utf8');
    return (JSON.parse(raw) as { brands?: BrandConfig[] }).brands ?? [];
  } catch {
    return [];
  }
}

const entero = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v.trim());
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/**
 * La dieta de una marca. El orden: entorno → config → default.
 *
 * Un techo menor que el piso se ordena en vez de rechazarse: es un error de
 * tipeo, y devolver una banda vacía haría que todos los meses queden "bajo el
 * piso" sin que nadie entienda por qué.
 */
export function dietaDe(brand: string, env: NodeJS.ProcessEnv = process.env): Dieta {
  const P = brand.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const decl = marcas().find((b) => b.id === brand)?.growth?.cadencia ?? {};
  const piso = entero(env[`CADENCIA_${P}_PISO`]) ?? decl.piso ?? POR_DEFECTO.piso;
  const techo = entero(env[`CADENCIA_${P}_TECHO`]) ?? decl.techo ?? POR_DEFECTO.techo;
  return piso <= techo ? { piso, techo } : { piso: techo, techo: piso };
}
