import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';
import { brandsConfig } from './sources';
import { destinosDe } from './destinos';
import { esHttp } from './enlaces';

// LOS ACCESOS DIRECTOS DE UNA MARCA.
//
// No hay config nueva para esto, y es a propósito: casi todo ya estaba declarado.
// Las cuentas salen de `config/sources.json` (que ya dice red y handle), el
// patrón para abrirlas sale de `config/networks.json` (es propiedad de la red,
// no de la marca), y los tableros salen de `config/destinos.json`. Lo único que
// hubo que agregar fue el bloque `enlaces` para lo que no es ninguna de las tres
// cosas — la carpeta de Drive.
//
// UN ACCESO SIN URL NO SE DIBUJA. Un link muerto es peor que la ausencia del
// link: promete y falla, y hace dudar de los que sí andan. Los que faltan se
// cuentan aparte para poder decir cuántos hay sin declarar.

export type Acceso = {
  id: string;
  label: string;
  detalle?: string;
  url: string;
  grupo: 'Coordinación' | 'Cuentas' | 'Archivos';
};

type Red = { label?: string; perfil_url?: string };
type Cuenta = { id: string; network: string; handle?: string; perfil_url?: string };
type Enlace = { id: string; nombre: string; descripcion?: string; url?: string; marcas: string[] | null };

function leer<T>(rel: string): T {
  return JSON.parse(readFileSync(join(repoRoot(), rel), 'utf8')) as T;
}

function redes(): Record<string, Red> {
  try {
    return leer<{ networks?: Record<string, Red> }>('config/networks.json').networks ?? {};
  } catch {
    return {};
  }
}

function enlaces(): Enlace[] {
  try {
    return leer<{ enlaces?: Enlace[] }>('config/destinos.json').enlaces ?? [];
  } catch {
    return [];
  }
}

/**
 * El perfil de una cuenta.
 *
 * `perfil_url` de la cuenta gana sobre el patrón de la red: LinkedIn distingue
 * empresa de persona y el handle solo no lo dice, así que el patrón sirve para
 * el caso común y la excepción se declara donde corresponde.
 */
function urlDeCuenta(c: Cuenta, red: Red | undefined): string {
  if (c.perfil_url) return c.perfil_url;
  if (!red?.perfil_url || !c.handle) return '';
  return red.perfil_url.replace('{handle}', c.handle);
}

export type Accesos = {
  lista: Acceso[];
  /** Los declarados SIN url, por nombre. Se dicen en vez de desaparecer. */
  sinDeclarar: string[];
};

export function accesosDe(brand: string): Accesos {
  const marca = brandsConfig().find((b) => b.id === brand);
  const lista: Acceso[] = [];
  const sinDeclarar: string[] = [];

  // Los tableros de coordinación.
  for (const d of destinosDe(brand)) {
    if (esHttp(d.url)) {
      lista.push({ id: `notion:${d.id}`, label: d.nombre, detalle: d.descripcion, url: d.url!, grupo: 'Coordinación' });
    } else {
      sinDeclarar.push(d.nombre);
    }
  }

  // Las cuentas de red. El handle se muestra porque es lo que identifica la
  // cuenta: una marca puede tener dos en la misma red.
  const rs = redes();
  const cuentas = ((marca as { accounts?: Cuenta[] } | undefined)?.accounts) ?? [];
  for (const c of cuentas) {
    const red = rs[c.network];
    const url = urlDeCuenta(c, red);
    const label = red?.label ?? c.network;
    if (esHttp(url)) {
      lista.push({ id: `cuenta:${c.id}`, label, detalle: c.handle ? `@${c.handle}` : undefined, url, grupo: 'Cuentas' });
    } else {
      sinDeclarar.push(`${label}${c.handle ? ` (@${c.handle})` : ''}`);
    }
  }

  // Lo que no es ni tablero ni cuenta.
  for (const e of enlaces()) {
    if (e.marcas !== null && !e.marcas.includes(brand)) continue;
    if (esHttp(e.url)) {
      lista.push({ id: `enlace:${e.id}`, label: e.nombre, detalle: e.descripcion, url: e.url!, grupo: 'Archivos' });
    } else {
      sinDeclarar.push(e.nombre);
    }
  }

  return { lista, sinDeclarar };
}
