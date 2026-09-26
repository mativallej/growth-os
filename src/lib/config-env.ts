import { existsSync, readFileSync, renameSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';

// Lectura y escritura de `.env.local`, para la pantalla de configuración.
//
// TRES REGLAS QUE NO SE NEGOCIAN:
//
// 1. UN SECRETO NUNCA VIAJA COMPLETO AL CLIENTE. Se manda una máscara
//    (`ntn_1201…FmO`) que alcanza para reconocer cuál está puesto y no para
//    usarlo. El campo de edición es de ESCRITURA: se pega uno nuevo o no se
//    toca. Sin esto, abrir el inspector en la pantalla de configuración sería
//    leer el `service_role`, que es acceso total a la base.
//
// 2. ESTO SOLO EXISTE EN EL ENTORNO LOCAL. Los módulos que lo importan se
//    llaman `.local.tsx` y esa extensión no está en `pageExtensions` fuera de
//    `GROWTH_CONSOLE=1` (ver next.config.ts). No hay ruta, no hay manejador.
//
// 3. SE ESCRIBE ATÓMICO Y CON PERMISOS. Temporal + rename, y `chmod 600`: un
//    `.env.local` a medio escribir por un corte deja al repo sin credenciales, y
//    uno legible por todo el sistema es un secreto compartido sin querer.

export type ClaveConfig = {
  /** La variable de entorno. */
  nombre: string;
  /** Qué es, en una línea, para quien la va a pegar. */
  descripcion: string;
  /** `secreto` se enmascara; `dato` se muestra entero (una URL no es un secreto). */
  tipo: 'secreto' | 'dato';
  /** De dónde se saca, textual. */
  donde?: string;
};

export type GrupoConfig = {
  id: string;
  titulo: string;
  detalle?: string;
  claves: ClaveConfig[];
};

export type EstadoClave = ClaveConfig & {
  /** Máscara, o `null` si no está puesta. NUNCA el valor completo. */
  muestra: string | null;
  puesta: boolean;
};

export type GrupoEstado = Omit<GrupoConfig, 'claves'> & { claves: EstadoClave[] };

function rutaEnv(): string {
  return join(repoRoot(), '.env.local');
}

/** Lee `.env.local` como pares. No se exporta: los valores no salen de este módulo. */
function leer(): Map<string, string> {
  const out = new Map<string, string>();
  const p = rutaEnv();
  if (!existsSync(p)) return out;
  for (const linea of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    out.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
  }
  return out;
}

/**
 * La máscara: los primeros y los últimos caracteres.
 *
 * Alcanza para reconocer cuál clave está puesta y para notar si alguien pegó la
 * equivocada. No alcanza para usarla. Un valor corto se enmascara entero, porque
 * mostrar 8 de 12 caracteres es casi mostrarlo.
 */
export function enmascarar(valor: string): string {
  const v = valor.trim();
  if (!v) return '';
  if (v.length <= 12) return '•'.repeat(v.length);
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

export function estadoDe(grupos: GrupoConfig[]): GrupoEstado[] {
  const env = leer();
  return grupos.map((g) => ({
    ...g,
    claves: g.claves.map((c) => {
      const v = env.get(c.nombre) ?? '';
      return {
        ...c,
        puesta: Boolean(v),
        muestra: v ? (c.tipo === 'secreto' ? enmascarar(v) : v) : null,
      };
    }),
  }));
}

/**
 * Escribe (o borra) claves en `.env.local`, conservando comentarios y orden.
 *
 * Un valor vacío NO borra: borrar una credencial tiene que ser explícito, porque
 * el caso frecuente es enviar el formulario sin tocar un campo, y eso no puede
 * significar "sacá el token".
 */
export function escribir(
  cambios: Record<string, string>,
  borrar: string[] = [],
): { escritas: string[]; borradas: string[] } {
  const p = rutaEnv();
  const lineas = existsSync(p) ? readFileSync(p, 'utf8').split(/\r?\n/) : [];
  const pendientes = new Map(
    Object.entries(cambios).filter(([, v]) => v.trim() !== ''),
  );
  const aBorrar = new Set(borrar);
  const escritas: string[] = [];
  const borradas: string[] = [];

  const salida: string[] = [];
  for (const linea of lineas) {
    const t = linea.trim();
    const eq = t.indexOf('=');
    const clave = !t || t.startsWith('#') || eq < 1 ? null : t.slice(0, eq).trim();

    if (clave && aBorrar.has(clave)) {
      borradas.push(clave);
      continue;
    }
    if (clave && pendientes.has(clave)) {
      salida.push(`${clave}=${pendientes.get(clave)!.trim()}`);
      escritas.push(clave);
      pendientes.delete(clave);
      continue;
    }
    salida.push(linea);
  }

  // Las que no existían se agregan al final.
  if (pendientes.size) {
    if (salida.length && salida[salida.length - 1].trim() !== '') salida.push('');
    for (const [k, v] of pendientes) {
      salida.push(`${k}=${v.trim()}`);
      escritas.push(k);
    }
  }

  // Atómico: temporal + rename. Un corte a mitad de escritura no puede dejar el
  // archivo truncado, que sería quedarse sin todas las credenciales a la vez.
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, salida.join('\n').replace(/\n*$/, '\n'), { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, p);
  chmodSync(p, 0o600);

  return { escritas, borradas };
}
