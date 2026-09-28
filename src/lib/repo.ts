import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

// Dónde está el repo, para el estado local (`.state/`) y para los ejecutables que
// una operación entrega a una sesión.
//
// `fail-loud-sources` sacó `process.cwd()` de la resolución de los VAULTS, que son
// externos y se mudan. Esto es distinto: `.state/` y `scripts/` viven adentro del
// repo. Aun así no se resuelve a ciegas — se verifica que la raíz sea la correcta y
// se rompe nombrando el problema. Un `.state/` fantasma haría que todas las
// operaciones se vean como "nunca ejecutada", que es justo el tipo de cero que
// parece información.

let cache: string | null = null;

export function repoRoot(env: Record<string, string | undefined> = process.env): string {
  if (cache) return cache;

  const declarada = env.GROWTH_REPO_DIR;
  if (declarada && !isAbsolute(declarada)) {
    throw new Error(`GROWTH_REPO_DIR tiene que ser absoluta: "${declarada}".`);
  }
  // turbopackIgnore: la raíz es dinámica a propósito (la puede declarar el
  // entorno), y sin esto Turbopack traza el proyecto entero hacia el bundle de
  // servidor. Es seguro porque esto solo lo importa la consola, que no existe
  // fuera del entorno local.
  const root = resolve(/* turbopackIgnore: true */ declarada ?? process.cwd());

  const pkg = join(root, 'package.json');
  if (!existsSync(pkg)) {
    throw new Error(
      `No hay package.json en ${root}, así que esa no es la raíz del repo.\n` +
        'Corré desde el repo, o declaralo con GROWTH_REPO_DIR.',
    );
  }
  // SE VERIFICA POR ESTRUCTURA Y NO POR NOMBRE.
  //
  // Antes comparaba `package.json`.name contra `'growth-loop'` literal. El
  // 2026-09-28 el proyecto se renombró a `growth-os` —una decisión tomada y
  // documentada en D-14— y esta línea volteó ONCE suites de tests con un mensaje
  // que decía "esa no es la raíz del repo". Era la raíz correcta; el que estaba
  // desactualizado era el guardia.
  //
  // Un nombre es justo lo que un proyecto puede cambiar. Estos tres archivos son
  // lo que ESTE repo tiene y un directorio padre no: si están los tres, es acá.
  const MARCAS = ['config/sources.json', 'next.config.ts', 'openspec'];
  const faltan = MARCAS.filter((m) => !existsSync(join(root, m)));
  if (faltan.length) {
    throw new Error(
      `${root} tiene package.json pero le falta ${faltan.join(', ')}, ` +
        'así que no es la raíz de este repo.\n' +
        'Corré desde el repo, o declaralo con GROWTH_REPO_DIR.',
    );
  }

  cache = root;
  return root;
}

/** Solo para los tests, que cambian de raíz entre casos. */
export function olvidarRepoRoot(): void {
  cache = null;
}

export function stateDir(env?: Record<string, string | undefined>): string {
  return join(repoRoot(env), '.state');
}
