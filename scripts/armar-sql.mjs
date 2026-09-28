#!/usr/bin/env node
/**
 * Arma `supabase/aplicar-todo.sql` concatenando `supabase/migrations/`.
 *
 * El archivo existe porque el proyecto de Supabase de Tegu está en una org a la
 * que el CLI no llega, así que las migraciones se aplican pegándolas en el SQL
 * Editor del dashboard. Un solo pegado, en orden, sin elegir.
 *
 * TIENE GENERADOR PORQUE DECÍA "Generado" Y NO LO ERA. Estaba concatenado a mano,
 * y a los diez minutos de cambiar una llave primaria en una migración el archivo
 * ya mentía: quien lo pegara habría creado un esquema que no existe en el repo.
 * `aplicar-todo.test.ts` falla si se desincronizan, así que no puede volver a
 * pasar en silencio.
 *
 *     node scripts/armar-sql.mjs        escribe el archivo
 *     node scripts/armar-sql.mjs --ver  lo imprime, sin escribir
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'supabase', 'migrations');
export const DESTINO = join(RAIZ, 'supabase', 'aplicar-todo.sql');

export function armar() {
  // Orden alfabético = orden cronológico: el prefijo es un timestamp. Si alguna
  // vez dejara de serlo, el índice se crearía en el orden equivocado y los FK
  // reventarían, que es ruidoso y es lo que queremos.
  const archivos = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  if (archivos.length === 0) throw new Error(`sin migraciones en ${DIR}`);

  return (
    [
      '-- growth-os · índice derivado del vault',
      '-- Pegar entero en el SQL Editor de Supabase.',
      '--',
      '-- GENERADO por scripts/armar-sql.mjs. No editar a mano: el próximo',
      '-- `node scripts/armar-sql.mjs` lo pisa. Se toca supabase/migrations/.',
    ].join('\n') +
    '\n\n' +
    archivos
      .map((f) => `-- ═══ ${f} ═══\n${readFileSync(join(DIR, f), 'utf8').trimEnd()}\n`)
      .join('\n')
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sql = armar();
  if (process.argv.includes('--ver')) {
    process.stdout.write(sql);
  } else {
    writeFileSync(DESTINO, sql);
    console.log(`${DESTINO}: ${sql.split('\n').length} líneas`);
  }
}
