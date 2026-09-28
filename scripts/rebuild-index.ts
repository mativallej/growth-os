#!/usr/bin/env tsx
/**
 * RECONSTRUYE EL ÍNDICE: lee el vault y lo escribe entero en Supabase.
 *
 * Se dispara desde el repo del VAULT cuando entra contenido, no desde acá: el
 * índice cambia cuando cambia un `.md`, y un merge de código no significa eso.
 * El workflow de allá clona este repo y corre este archivo.
 *
 * POR QUÉ EL SCRIPT VIVE EN `growth-os` Y NO EN EL VAULT. El contrato del footer
 * ya está implementado en tres lugares —`footer.ts`, `sync-notion.py`,
 * `audit-vaults.mjs`— y mantenerlos de acuerdo es trabajo permanente. Un cuarto,
 * en el indexador, garantizaría que el índice y el dashboard discrepen sobre qué
 * es una pieza: el bug que nadie ve, porque las dos mitades se ven sanas por
 * separado. Acá importa el MISMO parser que usa la app.
 *
 * ES LA ÚNICA COSA QUE ESCRIBE EL ÍNDICE, y usa la `service_role`. Esa clave vive
 * como secret del repo del vault y NO llega al deploy: el dashboard lee con la
 * publishable y el JWT de quien mira, y la RLS no le da permiso de escritura ni
 * queriendo (ver supabase/migrations/20260928000100_rls.sql).
 *
 *     SUPABASE_URL=… SUPABASE_SECRET_KEY=… VAULT_TEGU_DIR=/ruta npx tsx scripts/rebuild-index.ts
 *
 * Con `--dry` arma el payload y no escribe: sirve para ver qué leería sin tocar
 * nada, que es lo primero que uno quiere cuando el conteo no da.
 */
import { execFileSync } from 'node:child_process';
import { listSources } from '../src/lib/sources';
import { loadPiecesBySource } from '../src/lib/parse';
import { loadCreatives } from '../src/lib/ads';
import { loadFormulas } from '../src/lib/formulas';
import { construirPayload, type Payload } from '../src/lib/index-payload';

function fallar(mensaje: string): never {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

/** El commit del vault, para poder decir DE QUÉ versión salió este índice. */
function shaDelVault(dir: string): string | undefined {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    // Un vault que no es un repo git es raro pero no es un error: se indexa
    // igual y `builds.vault_sha` queda en NULL, que se lee como "no se sabe".
    return undefined;
  }
}

function resumir(p: Payload): string {
  return [
    `${p.pieces.length} piezas`,
    `${p.distribuciones.length} distribuciones`,
    `${p.snapshots.length} cortes`,
    `${p.creatives.length} creativos`,
    `${p.formulas.length} fórmulas`,
  ].join(' · ');
}

async function main() {
  const dry = process.argv.includes('--dry');

  const fuentes = listSources();
  // UNA INSTALACIÓN, UNA MARCA (D-17). Si un día son dos, el índice de una
  // pisaría al de la otra: el rebuild borra las tablas enteras.
  if (fuentes.length !== 1) {
    fallar(
      `config/sources.json declara ${fuentes.length} marcas y el índice es de UNA ` +
        '(D-17). El rebuild borra las tablas enteras: con dos marcas, la segunda ' +
        'corrida borraría el índice de la primera.',
    );
  }
  const marca = fuentes[0];

  const cargas = loadPiecesBySource(fuentes);
  const payload = construirPayload(
    cargas,
    loadCreatives(fuentes),
    loadFormulas(marca.id).formulas,
    shaDelVault(marca.vault),
  );

  console.log(`\nVault de ${marca.id}: ${resumir(payload)}`);

  // Lo que se pierde o está roto se dice ACÁ, antes de escribir, y no se
  // descubre leyendo la tabla `builds` después.
  if (payload.pieces_without_id > 0) {
    console.warn(
      `⚠ ${payload.pieces_without_id} pieza(s) sin \`id\` en el footer: NO entran al ` +
        'índice. Corré scripts/backfill-piece-id.py en el vault (D-9).',
    );
  }
  for (const u of payload.unreadable) console.warn(`⚠ ilegible: ${u.path} — ${u.reason}`);
  if (payload.duplicate_ids.length > 0) {
    // La base también lo rechaza; se dice antes para no mandar 500KB al pedo.
    fallar(
      `${payload.duplicate_ids.length} id(s) repetidos: la identidad está rota y ` +
        'ninguna referencia externa se resuelve hacia esas piezas.\n' +
        payload.duplicate_ids.map((d) => `  ${d.id}\n${d.paths.map((x) => `    ${x}`).join('\n')}`).join('\n'),
    );
  }
  // REGLA DURA 1, del lado del cliente además del de la base: un vault que no se
  // leyó devuelve cero, y un índice vacío en el dashboard parece información.
  if (payload.pieces.length === 0) {
    fallar('cero piezas indexables. El vault no se leyó; no se escribe un índice vacío.');
  }

  if (dry) {
    console.log('\n--dry: no se escribió nada.\n');
    return;
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    fallar(
      'faltan SUPABASE_URL y/o SUPABASE_SECRET_KEY. La secret key es la que puede ' +
        'llamar a rebuild_index(); la publishable no, a propósito.',
    );
  }

  const r = await fetch(`${url}/rest/v1/rpc/rebuild_index`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload }),
  });

  const cuerpo = await r.text();
  if (!r.ok) {
    if (cuerpo.includes('PGRST202') || cuerpo.includes('rebuild_index')) {
      fallar(
        `Supabase rechazó el rebuild (HTTP ${r.status}). Si dice que no encuentra la ` +
          'función, falta aplicar supabase/migrations/ — el esquema va primero.\n' +
          cuerpo.slice(0, 400),
      );
    }
    fallar(`Supabase devolvió HTTP ${r.status}.\n${cuerpo.slice(0, 400)}`);
  }

  console.log(`\n✓ Índice reconstruido: ${cuerpo}\n`);
}

main().catch((e: unknown) => fallar(e instanceof Error ? e.stack ?? e.message : String(e)));
