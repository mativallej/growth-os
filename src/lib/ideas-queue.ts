import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './repo';

// La cola local de ideas.
//
// Las ideas viven solo en el destino de coordinación desde el 2026-09-23, y este
// repo no tiene credencial de servicio para escribir ahí — no es un descuido, es
// la decisión de `unschedule-everything`. Entonces la captura encola local y la
// publicación es una operación aparte.
//
// El punto que manda sobre todos los demás: UNA IDEA SE CAPTA EN EL MOMENTO EN QUE
// APARECE O SE PIERDE. Por eso la captura no puede fallar por un problema de red,
// y por eso no tiene precondiciones. El precio es que la idea no está en el destino
// hasta que alguien empuja la cola; la mitigación es que la cola se ve, con su
// antigüedad, en la consola.

export type Idea = {
  id: string;
  texto: string;
  marca: string;
  captadaEl: string;
  publicadaEl?: string;
};

const ARCHIVO = 'ideas-queue.json';

function rutaCola(dir: string): string {
  return join(dir, ARCHIVO);
}

export function leerCola(dir = stateDir()): Idea[] {
  try {
    const crudo = JSON.parse(readFileSync(rutaCola(dir), 'utf8')) as unknown;
    return Array.isArray(crudo) ? (crudo as Idea[]) : [];
  } catch {
    return []; // todavía no hay cola: no es un error
  }
}

function escribirCola(ideas: Idea[], dir: string): void {
  mkdirSync(dir, { recursive: true });
  // Temporal + rename: si el proceso se corta a la mitad, la cola vieja sigue
  // entera. Perder una idea por un archivo escrito a medias sería exactamente lo
  // que esta cola existe para evitar.
  const tmp = `${rutaCola(dir)}.tmp`;
  writeFileSync(tmp, JSON.stringify(ideas, null, 2) + '\n', 'utf8');
  renameSync(tmp, rutaCola(dir));
}

function nuevoId(ahora: Date, existentes: Set<string>): string {
  const base = ahora.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  let id = base;
  let n = 1;
  while (existentes.has(id)) id = `${base}-${++n}`;
  return id;
}

/** Guarda la idea YA. No consulta el destino ni la red. */
export function captar(
  texto: string,
  marca: string,
  dir = stateDir(),
  ahora = new Date(),
): Idea {
  const limpio = texto.trim();
  if (!limpio) throw new Error('Una idea vacía no se guarda.');

  const ideas = leerCola(dir);
  const idea: Idea = {
    id: nuevoId(ahora, new Set(ideas.map((i) => i.id))),
    texto: limpio,
    marca,
    captadaEl: ahora.toISOString(),
  };
  escribirCola([...ideas, idea], dir);
  return idea;
}

export function pendientes(dir = stateDir()): Idea[] {
  return leerCola(dir).filter((i) => !i.publicadaEl);
}

/**
 * Marca publicadas las que se publicaron. Es lo que hace idempotente a la
 * operación de publicación: lo ya marcado no vuelve a ofrecerse, así que publicar
 * dos veces no duplica nada.
 */
export function marcarPublicadas(
  ids: string[],
  dir = stateDir(),
  ahora = new Date(),
): number {
  const pedidos = new Set(ids);
  let marcadas = 0;
  const ideas = leerCola(dir).map((i) => {
    if (!pedidos.has(i.id) || i.publicadaEl) return i;
    marcadas++;
    return { ...i, publicadaEl: ahora.toISOString() };
  });
  if (marcadas) escribirCola(ideas, dir);
  return marcadas;
}

export function diasEnCola(idea: Idea, ahora = new Date()): number {
  return Math.floor((ahora.getTime() - new Date(idea.captadaEl).getTime()) / 86_400_000);
}
