import { readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { repoRoot } from './repo';
import { envVarDe, type BrandConfig } from './sources';

// AGREGAR Y QUITAR MARCAS desde la pantalla de configuración.
//
// `config/sources.json` está en git y es lo que hace andar el repo. Que se pueda
// editar desde una pantalla es cómodo, pero abre dos riesgos que este módulo
// existe para cerrar:
//
// 1. DEJARLO CORRUPTO. Se escribe atómico (temporal + rename) y se valida antes:
//    un JSON a medias deja la app sin saber dónde está ningún vault.
// 2. BORRAR ALGO QUE NO SE PUEDE RECUPERAR. Quitar una marca no toca su vault
//    —eso no se hace nunca desde acá— pero sí pierde su configuración. Por eso
//    la operación devuelve lo que borró, para poder mostrarlo antes y después.

export type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

function ruta(): string {
  return join(repoRoot(), 'config/sources.json');
}

type Config = { brands: BrandConfig[] } & Record<string, unknown>;

function leer(): Config {
  return JSON.parse(readFileSync(ruta(), 'utf8')) as Config;
}

function guardar(config: Config): void {
  const p = ruta();
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8');
  renameSync(tmp, p);
}

const ID_VALIDO = /^[a-z][a-z0-9-]{1,30}$/;

function expandir(p: string): string {
  const t = p.trim();
  return t === '~' || t.startsWith('~/') ? join(homedir(), t.slice(1)) : t;
}

export type MarcaNueva = {
  id: string;
  label: string;
  /** Raíz del vault. Se recomienda `~/vaults/<nombre>`, que es un symlink estable. */
  vault: string;
  /** Subcarpeta con las piezas, relativa al vault. */
  content: string;
};

/**
 * Valida una marca nueva ANTES de escribir nada.
 *
 * Todo lo que se puede verificar se verifica acá, y el mensaje dice qué está
 * mal. Escribir primero y que el build se caiga después deja al repo en un
 * estado que hay que arreglar a mano.
 */
export function validarMarca(m: MarcaNueva, existentes: BrandConfig[]): string | null {
  const id = m.id.trim().toLowerCase();
  if (!ID_VALIDO.test(id)) {
    return 'El id va en minúsculas, empieza con letra y admite números y guiones. Es lo que va a aparecer en la URL.';
  }
  if (existentes.some((b) => b.id === id)) return `Ya existe una marca con el id "${id}".`;
  if (!m.label.trim()) return 'Falta el nombre visible de la marca.';

  const vault = expandir(m.vault);
  if (!vault) return 'Falta la ruta del vault.';
  if (!isAbsolute(vault)) {
    return 'La ruta del vault tiene que ser absoluta o empezar con ~/. Una relativa depende de desde dónde se corra el build.';
  }
  try {
    if (!statSync(vault).isDirectory()) return `${vault} no es un directorio.`;
  } catch {
    return `No existe ${vault}.`;
  }

  const content = m.content.trim().replace(/^\/+|\/+$/g, '');
  if (!content) return 'Falta la subcarpeta con las piezas, relativa al vault.';
  try {
    if (!statSync(resolve(vault, content)).isDirectory()) {
      return `No existe ${content} dentro del vault.`;
    }
  } catch {
    return `No existe ${content} dentro del vault.`;
  }

  // El vault se referencia por symlink estable a propósito: una ruta real se
  // rompe en silencio cuando la carpeta se renombra, y ya pasó.
  return null;
}

export function agregarMarca(m: MarcaNueva): Resultado {
  try {
    const config = leer();
    const error = validarMarca(m, config.brands);
    if (error) return { ok: false, error };

    const id = m.id.trim().toLowerCase();
    config.brands.push({
      id,
      label: m.label.trim(),
      vault: m.vault.trim(),
      content: m.content.trim().replace(/^\/+|\/+$/g, ''),
      notion: { ads: [], docs: [] },
      growth: { cadencia: { piso: 10, techo: 14 }, digest: false },
    } as BrandConfig);
    guardar(config);

    return {
      ok: true,
      mensaje:
        `Marca "${id}" agregada. Su vault se puede reapuntar con ${envVarDe(id)}. ` +
        'Reiniciá el servidor para que aparezca.',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Quita una marca de la config.
 *
 * NO TOCA SU VAULT: los archivos son del humano, y esta app no los borra nunca.
 * Lo que se pierde es la configuración, y por eso el mensaje dice exactamente
 * qué se sacó — para poder volver a ponerlo si fue un error.
 *
 * No se permite quitar la última: un registro vacío deja la app sin ninguna
 * fuente, y eso rompe el build con un error que no dice que alguien apretó un
 * botón.
 */
export function quitarMarca(id: string): Resultado {
  try {
    const config = leer();
    const marca = config.brands.find((b) => b.id === id);
    if (!marca) return { ok: false, error: `No existe una marca con el id "${id}".` };
    if (config.brands.length <= 1) {
      return { ok: false, error: 'Es la única marca declarada. Quitarla dejaría la app sin ninguna fuente.' };
    }

    config.brands = config.brands.filter((b) => b.id !== id);
    guardar(config);

    return {
      ok: true,
      mensaje:
        `Marca "${id}" quitada de la config. Su vault (${marca.vault}) NO se tocó. ` +
        'Reiniciá el servidor.',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
