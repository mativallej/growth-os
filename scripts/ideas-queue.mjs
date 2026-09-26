#!/usr/bin/env node
// La cola de ideas desde la línea de comandos. La usa la sesión local cuando
// publica: lista lo pendiente, y marca publicada cada idea que empujó.
//
// Comparte el archivo con src/lib/ideas-queue.ts — .state/ideas-queue.json — y no
// la lógica, que son treinta líneas. Si cambia el formato, cambia en los dos.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COLA = join(dirname(dirname(fileURLToPath(import.meta.url))), '.state/ideas-queue.json');

function leer() {
  try {
    const x = JSON.parse(readFileSync(COLA, 'utf8'));
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function escribir(ideas) {
  writeFileSync(`${COLA}.tmp`, JSON.stringify(ideas, null, 2) + '\n', 'utf8');
  renameSync(`${COLA}.tmp`, COLA);
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'pendientes') {
  const p = leer().filter((i) => !i.publicadaEl);
  if (!p.length) {
    console.log('No hay ideas pendientes de publicar.');
    process.exit(0);
  }
  console.log(`${p.length} idea(s) pendientes:\n`);
  for (const i of p) console.log(`  [${i.id}] (${i.marca}) ${i.texto.replace(/\n/g, ' ')}`);
  console.log('\nDespués de publicar cada una: node scripts/ideas-queue.mjs marcar <id>');
} else if (cmd === 'marcar') {
  if (!args.length) {
    console.error('Falta el id. Uso: node scripts/ideas-queue.mjs marcar <id> [<id>…]');
    process.exit(1);
  }
  const pedidos = new Set(args);
  let n = 0;
  const ideas = leer().map((i) => {
    if (!pedidos.has(i.id) || i.publicadaEl) return i;
    n++;
    return { ...i, publicadaEl: new Date().toISOString() };
  });
  if (n) escribir(ideas);
  console.log(`${n} idea(s) marcadas como publicadas.`);
} else {
  console.error('Uso: node scripts/ideas-queue.mjs pendientes | marcar <id>…');
  process.exit(1);
}
