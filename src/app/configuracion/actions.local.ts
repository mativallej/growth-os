'use server';

import { revalidatePath } from 'next/cache';
import { statSync } from 'node:fs';
import { escribir } from '@/lib/config-env';
import { gruposPorMarca, grupoGeneral } from '@/lib/config-catalogo';
import { listSources } from '@/lib/sources';
import { agregarMarca, quitarMarca, type Resultado } from '@/lib/config-marcas';
import {
  guardarUmbrales,
  type EntradaUmbral,
  type Resultado as ResultadoViralidad,
} from '@/lib/config-viralidad';

// Los efectos viven SOLO acá. Abrir o recargar la pantalla de configuración no
// escribe nada: una acción de servidor se invoca con un POST desde el formulario.

export type ResultadoConfig = { ok: boolean; mensaje: string };

function texto(fd: FormData, clave: string): string {
  const v = fd.get(clave);
  return typeof v === 'string' ? v : '';
}

/** Las claves que el catálogo DECLARA. Un campo de más en el POST no llega al archivo. */
function clavesPermitidas(): Set<string> {
  return new Set(
    [...gruposPorMarca(), grupoGeneral()].flatMap((g) => g.claves.map((c) => c.nombre)),
  );
}

export async function guardarConfig(
  _previo: ResultadoConfig,
  fd: FormData,
): Promise<ResultadoConfig> {
  try {
    const permitidas = clavesPermitidas();
    const cambios: Record<string, string> = {};
    const borrar: string[] = [];

    for (const [k, v] of fd.entries()) {
      if (typeof v !== 'string') continue;
      if (k.startsWith('__borrar:')) {
        const clave = k.slice('__borrar:'.length);
        if (permitidas.has(clave)) borrar.push(clave);
        continue;
      }
      // Solo lo declarado, y solo si trae valor: un campo vacío es "no lo toqué",
      // no "borrá la credencial". Borrar es explícito.
      if (!permitidas.has(k) || v.trim() === '') continue;
      cambios[k] = v;
    }

    const { escritas, borradas } = escribir(cambios, borrar);
    if (!escritas.length && !borradas.length) {
      return { ok: true, mensaje: 'No había nada para cambiar.' };
    }

    revalidatePath('/configuracion');
    const partes = [
      escritas.length ? `${escritas.length} guardada(s)` : '',
      borradas.length ? `${borradas.length} borrada(s)` : '',
    ].filter(Boolean);
    return {
      ok: true,
      mensaje: `${partes.join(' · ')}. Reiniciá el servidor para que las tome.`,
    };
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : String(err) };
  }
}

export type Chequeo = { id: string; nombre: string; ok: boolean; detalle: string };

/**
 * Prueba las conexiones contra el servicio real, de verdad.
 *
 * Read-only: `users/me` en Notion y `GET /rest/v1/` en Supabase. No escribe nada
 * en ningún lado. Un chequeo que solo mirara si la variable existe diría "todo
 * bien" con un token vencido — que es la clase de verde que no sirve.
 */
export async function probarConexiones(): Promise<Chequeo[]> {
  const out: Chequeo[] = [];
  const timeout = () => AbortSignal.timeout(8000);

  // Los vaults primero: si una raíz no está, ninguna otra conexión importa.
  // Es la REGLA DURA 1 — un vault ausente tiene que gritar, no devolver vacío.
  for (const s of listSources()) {
    const faltan = s.roots.filter((r) => {
      try {
        return !statSync(r).isDirectory();
      } catch {
        return true;
      }
    });
    out.push({
      id: `vault-${s.id}`,
      nombre: `Vault · ${s.label}`,
      ok: faltan.length === 0,
      detalle: faltan.length === 0
        ? `${s.roots.length} raíz/raíces, todas existen.`
        : `No existe: ${faltan.join(', ')}. Reapuntalo con ${s.envVar}.`,
    });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    out.push({ id: 'notion', nombre: 'Notion', ok: false, detalle: 'Sin NOTION_TOKEN.' });
  } else {
    try {
      const r = await fetch('https://api.notion.com/v1/users/me', {
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
        signal: timeout(),
      });
      if (!r.ok) {
        out.push({ id: 'notion', nombre: 'Notion', ok: false, detalle: `El token no es válido (HTTP ${r.status}).` });
      } else {
        // El token puede ser válido y no ver NADA: es el error más común, y el
        // que más se confunde con un bug del script.
        const s = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_size: 1 }),
          signal: timeout(),
        });
        const d = (await s.json()) as { results?: unknown[] };
        const n = d.results?.length ?? 0;
        out.push({
          id: 'notion',
          nombre: 'Notion',
          ok: n > 0,
          detalle: n > 0
            ? 'Token válido y con páginas compartidas.'
            : 'Token válido pero NO VE NINGUNA PÁGINA. Falta compartirle la página Growth: ⋯ → Connections → conectar la integración.',
        });
      }
    } catch (err) {
      out.push({ id: 'notion', nombre: 'Notion', ok: false, detalle: err instanceof Error ? err.message : String(err) });
    }
  }

  for (const g of gruposPorMarca()) {
    const P = g.id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const url = process.env[`SUPABASE_${P}_URL`];
    const key = process.env[`SUPABASE_${P}_SERVICE_ROLE_KEY`];
    const id = `supabase-${g.id}`;
    const nombre = `Supabase · ${g.titulo}`;
    if (!url || !key) {
      out.push({ id, nombre, ok: false, detalle: 'Falta la URL o la service_role.' });
      continue;
    }
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        headers: { apikey: key },
        signal: timeout(),
      });
      out.push({ id, nombre, ok: r.ok, detalle: r.ok ? 'Responde.' : `HTTP ${r.status}.` });
    } catch (err) {
      out.push({ id, nombre, ok: false, detalle: err instanceof Error ? err.message : String(err) });
    }
  }

  return out;
}

/**
 * Agrega un vault a la config.
 *
 * Valida ANTES de escribir: que el id sirva como segmento de URL, que la ruta
 * exista y que la subcarpeta de contenido exista adentro. Escribir primero y
 * que el build se caiga después deja el repo en un estado que hay que arreglar
 * a mano.
 */
export async function agregarVault(
  _previo: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const r = agregarMarca({
    id: texto(fd, 'nuevo_id'),
    label: texto(fd, 'nuevo_label'),
    vault: texto(fd, 'nuevo_vault'),
    content: texto(fd, 'nuevo_content'),
  });
  if (r.ok) revalidatePath('/configuracion');
  return r;
}

/**
 * Quita un vault de la config. NO TOCA SUS ARCHIVOS: son del humano, y esta app
 * no los borra nunca. Lo que se pierde es la configuración.
 */
export async function quitarVault(
  _previo: Resultado,
  fd: FormData,
): Promise<Resultado> {
  const r = quitarMarca(texto(fd, 'quitar_id'));
  if (r.ok) revalidatePath('/configuracion');
  return r;
}

/**
 * Guarda los umbrales de viralidad.
 *
 * Los canales salen del propio formulario (`canal:<id>`) y no de una lista fija:
 * el conjunto de canales lo decide el corpus, así que uno nuevo aparece solo.
 * Un `viral` vacío QUITA el umbral de ese canal — es la única forma de volver a
 * "sin criterio declarado", que es un estado legítimo y distinto de cero.
 */
export async function guardarViralidad(
  _previo: ResultadoViralidad,
  fd: FormData,
): Promise<ResultadoViralidad> {
  const entradas: EntradaUmbral[] = [];
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string' || !k.startsWith('canal:')) continue;
    const canal = k.slice('canal:'.length);
    entradas.push({
      canal,
      viral: texto(fd, `viral:${canal}`),
      destacado: texto(fd, `destacado:${canal}`),
    });
  }
  const r = guardarUmbrales(entradas);
  if (r.ok) revalidatePath('/configuracion');
  return r;
}
