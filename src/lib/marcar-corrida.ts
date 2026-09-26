import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './repo';

// EL ESCRITOR de la marca de última corrida (tarea 4.1 de unschedule-everything).
//
// `last-run.ts` la lee; nadie la escribía, así que las nueve operaciones se veían
// como "nunca se ejecutó" para siempre. Y esa antigüedad no es decorativa: es la
// mitigación del costo que se aceptó al apagar todo lo agendado. Si nada corre
// solo, lo que puede pasar es que nadie apriete el botón — y lo único que hace
// que eso se note es ver hace cuánto que no se aprieta.
//
// SOLO SE MARCA EL ÉXITO. Una corrida que falló no es "se hizo": si se guardara
// igual, la antigüedad diría que la operación está al día cuando en realidad
// falló hace un minuto, que es peor que no tener el dato.

export type Corrida = {
  /** ISO. Cuándo terminó. */
  at: string;
  ok: boolean;
  /** Qué pasó, en una línea. Para poder mirar sin abrir un log. */
  detalle?: string;
};

export function marcarCorrida(
  id: string,
  ok: boolean,
  detalle?: string,
  dir = stateDir(),
): void {
  if (!ok) return; // una corrida fallida no deja marca de "al día"
  const registro: Corrida = { at: new Date().toISOString(), ok: true, detalle };
  try {
    mkdirSync(dir, { recursive: true });
    // Atómico: un registro a medio escribir se lee como ilegible, y eso se
    // reporta como "nunca corrió" — que sería mentir hacia el lado seguro, pero
    // mentir igual.
    const destino = join(dir, `last-run-${id}.json`);
    const tmp = `${destino}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(registro, null, 2) + '\n', 'utf8');
    renameSync(tmp, destino);
  } catch {
    // Que no se pueda registrar no puede voltear la operación: lo que importa
    // ya pasó. Se pierde la antigüedad, no el trabajo.
  }
}
