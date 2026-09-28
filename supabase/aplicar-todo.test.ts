import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { armar, DESTINO } from '../scripts/armar-sql.mjs';

/**
 * El archivo que se pega en el dashboard tiene que ser las migraciones del repo.
 *
 * Estuvo concatenado a mano y se desincronizó al primer cambio de esquema: el
 * repo tenía una llave primaria y el archivo otra. Nadie lo habría notado hasta
 * ver el error del insert contra una base ya creada mal.
 */
it('aplicar-todo.sql está al día con supabase/migrations/', () => {
  expect(readFileSync(DESTINO, 'utf8')).toBe(armar());
});
