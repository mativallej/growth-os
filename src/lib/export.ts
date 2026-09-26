import { loadPieces } from './parse';
import { loadCreatives } from './ads';
import { findSource, listSources, type SourceId } from './sources';
import { latest, primaryReach } from './metrics';
import { formulaCodeOf, loadFormulas } from './formulas';
import { enlaceRastreable } from './attribution';

// Exportar piezas y creativos a CSV.
//
// EL REQUISITO QUE MANDA ACÁ ES EL AISLAMIENTO. Un export se pide desde UNA
// marca y no puede traer una fila de la otra — y la garantía no es un filtro
// sobre el conjunto completo, es que el conjunto completo nunca se carga:
// `loadPieces([fuente])` lee solo ese vault. Si la marca pedida no entró al
// build, el export no existe, igual que su ruta.
//
// Y un export vacío NO es un archivo vacío: es un mensaje. Un CSV con solo
// cabecera se abre, se ve una planilla, y parece que no hay nada — cuando lo que
// pasó es que el filtro no dejó pasar nada (regla dura 1).

export type FiltroExport = {
  marca: string;
  /** Solo para el export de enlaces: a dónde apunta cada uno. */
  destino?: string;
  /** Una sola pieza, por su ruta relativa al vault. */
  objetivo?: string;
  materia?: 'piezas' | 'ads' | string;
  canal?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

export type ResultadoExport =
  | { ok: true; nombre: string; contenido: string; filas: number }
  | { ok: false; motivo: string };

/** Una celda de CSV: comillas dobles solo si hacen falta, y escapadas adentro. */
function celda(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(cabeceras: string[], filas: unknown[][], preambulo: string[]): string {
  return [
    ...preambulo.map((l) => `# ${l}`),
    cabeceras.join(','),
    ...filas.map((f) => f.map(celda).join(',')),
  ].join('\n');
}

/**
 * La cabecera de procedencia.
 *
 * Un CSV suelto dentro de seis meses no dice de dónde salió ni con qué filtros,
 * y alguien lo va a leer como si fuera el total. Va comentada con `#` para que
 * las planillas la muestren y los lectores de CSV la puedan saltear.
 */
function preambulo(op: string, filtro: FiltroExport, filas: number): string[] {
  const aplicados = Object.entries(filtro)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${v}`);
  return [
    `growth-loop · ${op}`,
    `generado: ${new Date().toISOString()}`,
    `filtros: ${aplicados.length ? aplicados.join(' · ') : 'ninguno'}`,
    `filas: ${filas}`,
    'La fuente de verdad son los .md del vault. Esto es una foto, no el original.',
  ];
}

function enRango(fecha: string | undefined, desde?: string, hasta?: string): boolean {
  if (!desde && !hasta) return true;
  if (!fecha) return false; // sin fecha no se puede afirmar que esté en el rango
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

export function exportar(filtro: FiltroExport): ResultadoExport {
  const fuentes = listSources();
  const source = findSource(filtro.marca, fuentes);
  if (!source) {
    return {
      ok: false,
      motivo:
        `La marca "${filtro.marca}" no entró a este build. ` +
        `Las disponibles son: ${fuentes.map((s) => s.id).join(', ')}.`,
    };
  }

  const esAds = filtro.materia === 'ads';
  const sello = new Date().toISOString().slice(0, 10);

  if (esAds) {
    const creativos = loadCreatives([source]).filter(() => enRango(undefined, undefined, undefined));
    if (creativos.length === 0) {
      return {
        ok: false,
        motivo: `${source.label} no tiene creativos que cumplan los filtros. No se genera un archivo vacío.`,
      };
    }
    const filas = creativos.map((c) => [
      c.title, c.persona ?? '', c.publico ?? '', c.dolor ?? '', c.formato ?? '',
      c.angulo ?? '', c.ronda ?? '', c.cta ?? '', c.estado ?? '',
      c.derivadas.join(' '), c.relPath,
    ]);
    return {
      ok: true,
      nombre: `creativos-${source.id}-${sello}.csv`,
      filas: filas.length,
      contenido: csv(
        ['titulo', 'persona', 'publico', 'dolor', 'formato', 'angulo', 'ronda', 'cta', 'estado', 'derivadas', 'ruta'],
        filas,
        preambulo('export-creativos', filtro, filas.length),
      ),
    };
  }

  const catalogo = loadFormulas().formulas;
  const piezas = loadPieces([source]).filter((p) => {
    if (filtro.objetivo && p.relPath !== filtro.objetivo) return false;
    if (filtro.canal && p.channel !== filtro.canal) return false;
    if (filtro.estado && p.status !== filtro.estado) return false;
    return enRango(p.publishedAt, filtro.desde, filtro.hasta);
  });

  if (piezas.length === 0) {
    return {
      ok: false,
      motivo:
        `Ninguna pieza de ${source.label} cumple los filtros. ` +
        'No se genera un archivo vacío: un CSV con solo cabecera se lee como "no hay nada" ' +
        'cuando en realidad el filtro no dejó pasar nada.',
    };
  }

  const filas = piezas.map((p) => {
    const l = latest(p);
    return [
      p.id ?? '', p.title, p.channel, p.cuenta ?? '', formulaCodeOf(p, catalogo) ?? '',
      p.status, p.publishedAt ?? '', p.url ?? '', p.coverage, p.snapshots.length,
      primaryReach(p) ?? '', l?.engagements ?? '', l?.bookmarks ?? '', l?.follows ?? '',
      p.relPath,
    ];
  });

  return {
    ok: true,
    nombre: `piezas-${source.id}-${sello}.csv`,
    filas: filas.length,
    contenido: csv(
      ['id', 'titulo', 'canal', 'cuenta', 'formula', 'estado', 'fecha', 'url',
       'cobertura', 'cortes', 'alcance', 'engagements', 'guardados', 'follows', 'ruta'],
      filas,
      preambulo('export-piezas', filtro, filas.length),
    ),
  };
}

/** Las marcas que este build puede exportar. Para el selector de la consola. */
export function marcasExportables(): SourceId[] {
  return listSources().map((s) => s.id);
}

/**
 * Los enlaces rastreables de las piezas que pasan los filtros.
 *
 * Sale del mismo lugar que los otros exports porque comparte lo que importa: el
 * aislamiento. Se lee UNA fuente, así que no hay forma de que un enlace de una
 * marca salga en el export de la otra.
 *
 * Una pieza que no puede llevar enlace **igual sale en el archivo**, con su
 * motivo en lugar de la url. Omitirla haría que el export parezca completo
 * cuando le falta justo lo que no se puede atribuir, que es el dato.
 */
export function exportarEnlaces(filtro: FiltroExport): ResultadoExport {
  const fuentes = listSources();
  const source = findSource(filtro.marca, fuentes);
  if (!source) {
    return {
      ok: false,
      motivo:
        `La marca "${filtro.marca}" no entró a este build. ` +
        `Las disponibles son: ${fuentes.map((s) => s.id).join(', ')}.`,
    };
  }
  const destino = (filtro.destino ?? '').trim();
  if (!destino) {
    return { ok: false, motivo: 'Falta el destino: el enlace tiene que llevar a algún lado propio.' };
  }

  const piezas = loadPieces([source]).filter((p) => {
    if (filtro.objetivo && p.relPath !== filtro.objetivo) return false;
    if (filtro.canal && p.channel !== filtro.canal) return false;
    return enRango(p.publishedAt, filtro.desde, filtro.hasta);
  });

  if (piezas.length === 0) {
    return {
      ok: false,
      motivo: `Ninguna pieza de ${source.label} cumple los filtros. No se genera un archivo vacío.`,
    };
  }

  const filas = piezas.map((p) => {
    const r = enlaceRastreable(p, destino);
    return [
      p.id ?? '',
      p.title,
      p.channel,
      p.publishedAt ?? '',
      r.atribuible ? r.clave : '',
      // La llave frágil se marca: sale del slug, y el slug sale de la ruta.
      r.atribuible ? (r.deId ? 'id' : 'slug') : '',
      r.atribuible ? r.url : '',
      r.atribuible ? '' : r.motivo,
      p.relPath,
    ];
  });

  const sello = new Date().toISOString().slice(0, 10);
  const noAtribuibles = filas.filter((f) => !f[6]).length;
  const porSlug = filas.filter((f) => f[5] === 'slug').length;

  return {
    ok: true,
    nombre: `enlaces-${source.id}-${sello}.csv`,
    filas: filas.length,
    contenido: csv(
      ['id', 'titulo', 'canal', 'fecha', 'utm_content', 'llave', 'enlace', 'motivo', 'ruta'],
      filas,
      [
        ...preambulo('enlace-atribucion', filtro, filas.length),
        `destino: ${destino}`,
        `sin enlace: ${noAtribuibles} · con llave fragil (del slug, no del id): ${porSlug}`,
        'Un enlace ya publicado no se puede corregir. Si su llave sale de la ruta y la',
        'ruta cambia, el dato no se rompe: apunta a otra pieza. Ver docs/attribution.md.',
      ],
    ),
  };
}
