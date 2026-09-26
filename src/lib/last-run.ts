import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Operation } from './operations';
import { stateDir } from './repo';

// Hace cuánto corrió cada operación.
//
// Es la mitigación del costo que se aceptó en `unschedule-everything`: si nada
// corre solo, lo que puede pasar es que nadie apriete el botón. Que la antigüedad
// esté a la vista es lo que hace que eso se note.
//
// El registro lo escribe quien ejecuta — `.state/last-run-<id>.json`, tarea 4.1 de
// `unschedule-everything`. Acá solo se lee, y NO haber corrido nunca se distingue
// de haber corrido hace mucho: son dos problemas distintos.

export type Antiguedad =
  | { estado: 'nunca' }
  | { estado: 'al-dia'; dias: number; cuando: string }
  | { estado: 'vencida'; dias: number; cuando: string; periodoDias: number }
  | { estado: 'sin-periodo'; dias: number; cuando: string };

type Registro = { at?: string; ok?: boolean };

function leerRegistro(id: string, dir: string): Registro | null {
  try {
    const crudo = JSON.parse(readFileSync(join(dir, `last-run-${id}.json`), 'utf8')) as Registro;
    // Solo cuenta una corrida con éxito: una que falló no es "se hizo".
    if (crudo.ok === false) return null;
    return crudo.at ? crudo : null;
  } catch {
    return null; // no existe, o está ilegible: es lo mismo que nunca haber corrido
  }
}

export function antiguedad(op: Operation, ahora = new Date(), dir = stateDir()): Antiguedad {
  const reg = leerRegistro(op.id, dir);
  if (!reg?.at) return { estado: 'nunca' };

  const cuando = new Date(reg.at);
  if (Number.isNaN(cuando.getTime())) return { estado: 'nunca' };

  const dias = Math.floor((ahora.getTime() - cuando.getTime()) / 86_400_000);
  if (op.periodoDias === null) return { estado: 'sin-periodo', dias, cuando: reg.at };
  if (dias > op.periodoDias) {
    return { estado: 'vencida', dias, cuando: reg.at, periodoDias: op.periodoDias };
  }
  return { estado: 'al-dia', dias, cuando: reg.at };
}

export function describir(a: Antiguedad): string {
  switch (a.estado) {
    case 'nunca':
      return 'nunca se ejecutó';
    case 'vencida':
      return `hace ${a.dias} días — se espera cada ${a.periodoDias}`;
    default:
      return a.dias === 0 ? 'hoy' : `hace ${a.dias} ${a.dias === 1 ? 'día' : 'días'}`;
  }
}
