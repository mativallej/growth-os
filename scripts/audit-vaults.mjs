#!/usr/bin/env node
// Auditoría READ-ONLY de las fuentes de contenido. No escribe: ni en los vaults,
// ni en el repo. Solo lee y cuenta.
//
// Para qué: antes de tocar el parser hay que saber qué hay. El parser de hoy
// exige `canal`/`formula`/`formato` para considerar que un .md es una pieza, y
// los vaults ya escriben el contrato nuevo (`platform`/`status`/...). La brecha
// entre "archivos con footer" y "piezas que ve el parser" es el tamaño exacto
// del problema que arregla `footer-contract-parser`.
//
// Ojo con la duplicación: las rutas salen de config/sources.json, el mismo
// archivo que leen src/lib/sources.ts y scripts/sync-notion.py. Lo que se repite
// en los tres es la resolución (expandir ~, aplicar el override de env), no las
// rutas. Si eso cambia, cambia en los tres.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'config/sources.json'), 'utf8'));

// Mismo registro que src/lib/sources.ts.
const REGISTRY = [
  { id: 'tegu', brand: 'tegu', envVar: 'VAULT_TEGU_DIR' },
  { id: 'personal', brand: 'mativallej', envVar: 'VAULT_PERSONAL_DIR' },
];

// Las claves que el sistema conoce: el contrato (docs/footer-contract.md), las
// viejas que todavía conviven, y las de los creativos de ads. Lo que no está acá
// se reporta como desconocido — que es una señal, no un error.
const KNOWN = new Set([
  'platform', 'account', 'date', 'url', 'formula', 'status', 'snapshot',
  'notas', 'lectura', 'veredicto', 'hook', 'refs', 'tags', 'analytics',
  'verdict', 'drivers', 'why', 'lesson', 'note', 'analysis',
  'canal', 'cuenta', 'formato', 'fórmula', 'estado', 'link', 'fecha', 'red',
  'buyer persona', 'persona', 'público', 'publico', 'dolor', 'ángulo', 'angulo',
  'ronda', 'cta',
]);

const IDENTITY = new Set(['platform', 'canal', 'red', 'formula', 'fórmula', 'formato']);
const PAR = /^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ. -]{0,24}?):\s*(.*)$/;

function expandHome(p) {
  return p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p;
}

function absolute(p) {
  const e = expandHome(String(p).trim());
  if (!isAbsolute(e)) throw new Error(`Ruta de fuente relativa: "${p}". Tiene que ser absoluta o ~/...`);
  return resolve(e);
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function sources() {
  return REGISTRY.map((entry) => {
    const brand = CONFIG.brands.find((b) => b.id === entry.brand);
    if (!brand) throw new Error(`config/sources.json no declara la marca "${entry.brand}".`);
    const vault = absolute(process.env[entry.envVar] ?? brand.vault);
    const declared = Array.isArray(brand.content) ? brand.content : [brand.content];
    let roots = declared.map((r) => join(vault, r));
    const legacy = entry.id === 'tegu' ? process.env.VAULT_CONTENT_DIR : undefined;
    if (legacy) roots = [absolute(legacy)];
    return {
      id: entry.id,
      label: brand.label,
      vault,
      roots,
      ignore: (brand.notion?.ads ?? []).map((p) => join(vault, p)),
      envVar: entry.envVar,
    };
  });
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Lee UN archivo y devuelve qué tiene su footer. Entiende las dos gramáticas:
// un bullet por clave (brain) y varias claves por línea separadas por ` · ` (tegu).
function inspect(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  let sep = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '---') { sep = i; break; }
  }
  const claves = new Map();
  let snapshots = 0;
  if (sep !== -1) {
    for (const raw of lines.slice(sep + 1)) {
      const line = raw.trim().replace(/^[-*]\s+/, '');
      if (!line) continue;
      if (/^snapshot\s/i.test(line) || /(^|\s)t=[+-]/.test(line)) {
        snapshots++;
        claves.set('snapshot', (claves.get('snapshot') ?? 0) + 1);
        continue;
      }
      for (const seg of line.includes(' · ') ? line.split(' · ') : [line]) {
        const m = seg.trim().match(PAR);
        if (!m) continue;
        const k = m[1].trim().toLowerCase();
        claves.set(k, (claves.get(k) ?? 0) + 1);
      }
    }
  }
  const fecha = claves.has('date') || claves.has('fecha');
  return {
    tieneSeparador: sep !== -1,
    claves,
    conFooter: claves.size > 0,
    // Lo que el parser de HOY considera pieza (src/lib/parse.ts:172).
    piezaParaElParser: [...claves.keys()].some((k) => IDENTITY.has(k)),
    conMetricas: snapshots > 0,
    conFecha: fecha,
  };
}

function pad(s, n) {
  s = String(s);
  return s + ' '.repeat(Math.max(0, n - s.length));
}

function main() {
  const srcs = sources();

  const faltan = [];
  for (const s of srcs) {
    for (const r of s.roots) if (!isDir(r)) faltan.push(`  ${s.id} → ${r}  (reapuntar con ${s.envVar})`);
  }
  if (faltan.length) {
    console.error(`No existen ${faltan.length} raíz/raíces de contenido declaradas:\n${faltan.join('\n')}`);
    console.error('No se audita lo que no está. Arreglá el symlink o config/sources.json.');
    process.exit(1);
  }

  const slugs = new Map(); // slug -> [{source, relPath}]
  const desconocidas = new Map(); // clave -> {n, fuentes:Set}

  console.log(`\nAuditoría de fuentes · ${new Date().toISOString().slice(0, 10)} · read-only\n`);

  for (const s of srcs) {
    const stats = { total: 0, sinSeparador: 0, conFooter: 0, pieza: 0, metricas: 0, fecha: 0, sinMetadata: 0 };

    for (const root of s.roots) {
      for (const file of walk(root)) {
        if (s.ignore.some((d) => file === d || file.startsWith(d + '/'))) continue;
        stats.total++;
        const i = inspect(file);
        if (!i.tieneSeparador) stats.sinSeparador++;
        if (i.conFooter) stats.conFooter++;
        else stats.sinMetadata++;
        if (i.piezaParaElParser) stats.pieza++;
        if (i.conMetricas) stats.metricas++;
        if (i.conFecha) stats.fecha++;

        for (const [k, n] of i.claves) {
          if (KNOWN.has(k)) continue;
          const d = desconocidas.get(k) ?? { n: 0, fuentes: new Set() };
          d.n += n;
          d.fuentes.add(s.id);
          desconocidas.set(k, d);
        }

        if (i.piezaParaElParser) {
          const slug = slugify(relative(root, file).replace(/\.md$/i, ''));
          const rel = relative(s.vault, file);
          slugs.set(slug, [...(slugs.get(slug) ?? []), { source: s.id, rel }]);
        }
      }
    }

    console.log(`${s.id} · ${s.label}`);
    console.log(`  vault   ${s.vault}`);
    for (const r of s.roots) console.log(`  raíz    ${relative(s.vault, r)}`);
    console.log(`  ${pad('archivos .md', 22)}${stats.total}`);
    console.log(`  ${pad('con footer', 22)}${stats.conFooter}`);
    console.log(`  ${pad('piezas para el parser', 22)}${stats.pieza}${
      stats.conFooter > stats.pieza ? `   ← ${stats.conFooter - stats.pieza} con footer que el parser descarta` : ''
    }`);
    console.log(`  ${pad('con métricas', 22)}${stats.metricas}`);
    console.log(`  ${pad('con fecha', 22)}${stats.fecha}`);
    console.log(`  ${pad('sin metadata', 22)}${stats.sinMetadata}`);
    console.log('');
  }

  const orden = [...desconocidas.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log(`Claves desconocidas por frecuencia (${orden.length} distintas)`);
  if (!orden.length) console.log('  ninguna\n');
  else {
    for (const [k, d] of orden.slice(0, 30)) {
      console.log(`  ${pad(d.n, 6)}${pad(k, 32)}${[...d.fuentes].join(', ')}`);
    }
    if (orden.length > 30) console.log(`  … y ${orden.length - 30} más`);
    console.log('');
  }

  const colisiones = [...slugs.entries()].filter(([, v]) => v.length > 1);
  console.log(`Colisión de slugs entre fuentes (${colisiones.length})`);
  if (!colisiones.length) console.log('  ninguna — cada pieza tiene su propia URL\n');
  else {
    for (const [slug, docs] of colisiones) {
      console.log(`  ${slug}`);
      for (const d of docs) console.log(`      ${d.source}: ${d.rel}`);
    }
    console.log(
      `\n  ${colisiones.length} slug(s) los produce más de una pieza. Mientras las dos fuentes\n` +
        '  compartan el espacio de URLs, una tapa a la otra: lo cierra `account-scoped-routes`.\n',
    );
  }
}

main();
