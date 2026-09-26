'use server';

import { revalidatePath } from 'next/cache';
import { abrirSesion, prepararEntrega } from '@/lib/handoff';
import { captar, marcarPublicadas } from '@/lib/ideas-queue';
import { getOperation } from '@/lib/operations';
import { exportar } from '@/lib/export';
import type { ResultadoAccion } from './tipos.local';

// Los efectos viven SOLO acá, en acciones de servidor. Una acción se invoca con un
// POST desde una interacción: navegar, precargar o recargar la consola no ejecuta
// ninguna. Es la diferencia con un manejador GET, que se dispararía solo con que
// alguien abra la URL.

function texto(fd: FormData, clave: string): string {
  const v = fd.get(clave);
  return typeof v === 'string' ? v : '';
}

export async function dispararOperacion(
  _previo: ResultadoAccion,
  fd: FormData,
): Promise<ResultadoAccion> {
  const id = texto(fd, '__operacion');
  try {
    const op = getOperation(id);

    // Solo se leen los parámetros que la operación DECLARA. Un campo de más en el
    // formulario no llega ni al validador.
    const entrada: Record<string, string> = {};
    for (const p of op.params) {
      const v = texto(fd, p.id);
      if (v !== '') entrada[p.id] = v;
    }

    const entrega = prepararEntrega(op, entrada);
    const abierta = abrirSesion(entrega);

    revalidatePath('/operar');
    return {
      ok: true,
      mensaje: abierta
        ? 'Operación preparada y sesión abierta. La app no aplicó nada.'
        : 'Operación preparada. Abrí la sesión con el comando de abajo — la app no aplicó nada.',
      archivo: entrega.archivoContexto,
      comando: entrega.comandoSugerido,
      sesionAbierta: abierta,
      detalle: entrega.contexto,
    };
  } catch (err) {
    return { ok: false, mensaje: 'No se preparó nada.', detalle: err instanceof Error ? err.message : String(err) };
  }
}

export async function captarIdea(
  _previo: ResultadoAccion,
  fd: FormData,
): Promise<ResultadoAccion> {
  try {
    const op = getOperation('ideas-capturar');
    const marca = texto(fd, 'marca');
    const cuerpo = texto(fd, 'texto');

    // Se valida contra el catálogo igual que cualquier otra operación, aunque acá
    // la app sí escriba: el contenido lo aporta la persona, así que no hay nada
    // que revisar, pero los parámetros se siguen validando.
    const { validarParams } = await import('@/lib/operations');
    const v = validarParams(op, { marca, texto: cuerpo });
    if (!v.ok) {
      return { ok: false, mensaje: 'No se guardó.', detalle: v.errores.map((e) => `${e.param}: ${e.motivo}`).join('\n') };
    }

    const idea = captar(v.valores.texto, v.valores.marca);
    revalidatePath('/operar');
    return { ok: true, mensaje: `Idea guardada (${idea.id}). Queda pendiente de publicar.` };
  } catch (err) {
    return { ok: false, mensaje: 'No se guardó.', detalle: err instanceof Error ? err.message : String(err) };
  }
}

export async function marcarIdeaPublicada(
  _previo: ResultadoAccion,
  fd: FormData,
): Promise<ResultadoAccion> {
  const id = texto(fd, 'id');
  const n = marcarPublicadas([id]);
  revalidatePath('/operar');
  return {
    ok: true,
    mensaje: n ? `Idea ${id} marcada como publicada.` : `La idea ${id} ya estaba publicada.`,
  };
}

export type ResultadoExport =
  | { ok: true; nombre: string; contenido: string; filas: number }
  | { ok: false; mensaje: string };

/**
 * Genera un export y devuelve el archivo al navegador.
 *
 * NO escribe en disco: el archivo se arma en memoria y se descarga. Un export
 * que deja un CSV en una carpeta del repo crea una copia de los datos que
 * envejece en silencio, y la regla es que la verdad son los `.md`.
 */
export async function generarExport(
  _previo: ResultadoExport,
  fd: FormData,
): Promise<ResultadoExport> {
  try {
    const id = texto(fd, '__operacion');
    const op = getOperation(id);
    if (op.forma !== 'export') {
      return { ok: false, mensaje: `La operación "${id}" no es una exportación.` };
    }

    // Igual que al disparar: solo se leen los parámetros DECLARADOS.
    const entrada: Record<string, string> = {};
    for (const p of op.params) {
      const v = texto(fd, p.id);
      if (v !== '') entrada[p.id] = v;
    }

    const r = exportar({
      marca: entrada.marca ?? '',
      materia: entrada.materia,
      canal: entrada.canal,
      estado: entrada.estado,
      desde: entrada.desde,
      hasta: entrada.hasta,
    });
    if (!r.ok) return { ok: false, mensaje: r.motivo };
    return { ok: true, nombre: r.nombre, contenido: r.contenido, filas: r.filas };
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : String(err) };
  }
}
