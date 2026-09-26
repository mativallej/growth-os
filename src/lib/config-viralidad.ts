import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo';
import type { Umbral, Umbrales } from './viralidad';

// EDITAR LOS UMBRALES DE VIRALIDAD desde la pantalla de configuración.
//
// `config/viralidad.json` declara qué cuenta como viral en cada red. Es criterio
// del humano —"viral" significa algo distinto en cada canal y en cada marca— y
// por eso se declara en vez de derivarse. Que se pueda editar desde una pantalla
// abre los mismos dos riesgos que `config-marcas`, y se cierran igual:
//
// 1. DEJARLO CORRUPTO. Se valida antes y se escribe atómico (temporal + rename).
// 2. DEJARLO INCOHERENTE. Un umbral en cero o negativo haría viral a todo, y un
//    `destacado` por encima del `viral` deja el nivel intermedio vacío para
//    siempre. Las dos cosas se rechazan con el motivo, no se corrigen en silencio.

export type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

function ruta(): string {
  return join(repoRoot(), 'config/viralidad.json');
}

type Config = { por_canal?: Record<string, Umbral> } & Record<string, unknown>;

/** Una entrada tal como viene del formulario: strings, o vacío para "sin umbral". */
export type EntradaUmbral = { canal: string; viral: string; destacado: string };

export function validarUmbral(e: EntradaUmbral): string | null {
  const canal = e.canal.trim();
  if (!canal) return 'Falta el canal.';

  const viral = Number(e.viral);
  if (e.viral.trim() === '') return null; // vacío = quitar el umbral de ese canal
  if (!Number.isFinite(viral) || viral <= 0) {
    return `El umbral de ${canal} tiene que ser un número mayor que cero. Es un alcance, no un porcentaje.`;
  }

  if (e.destacado.trim() !== '') {
    const d = Number(e.destacado);
    if (!Number.isFinite(d) || d <= 0) {
      return `El "destacada" de ${canal} tiene que ser un número mayor que cero, o quedar vacío.`;
    }
    if (d >= viral) {
      // Si fuera mayor o igual, ninguna pieza caería nunca en "destacada": saltaría
      // de la base a viral, y el nivel del medio existiría sin poder ocuparse.
      return `El "destacada" de ${canal} (${d.toLocaleString('es-AR')}) tiene que ser MENOR que el de viral (${viral.toLocaleString('es-AR')}).`;
    }
  }
  return null;
}

/**
 * Reemplaza el bloque `por_canal` entero con lo que venga.
 *
 * Reemplaza y no mergea a propósito: el formulario manda todos los canales, y un
 * merge haría imposible QUITAR un umbral — dejar el campo vacío tiene que poder
 * significar "este canal vuelve a no tener criterio declarado".
 */
export function guardarUmbrales(entradas: EntradaUmbral[]): Resultado {
  try {
    for (const e of entradas) {
      const error = validarUmbral(e);
      if (error) return { ok: false, error };
    }

    const config = JSON.parse(readFileSync(ruta(), 'utf8')) as Config;
    const por_canal: Record<string, Umbral> = {};
    for (const e of entradas) {
      if (e.viral.trim() === '') continue;
      const viral = Number(e.viral);
      const d = e.destacado.trim() === '' ? undefined : Number(e.destacado);
      por_canal[e.canal.trim()] = d === undefined ? { viral } : { destacado: d, viral };
    }
    config.por_canal = por_canal;

    const p = ruta();
    const tmp = `${p}.tmp-${process.pid}`;
    writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n', 'utf8');
    renameSync(tmp, p);

    const n = Object.keys(por_canal).length;
    const sin = entradas.length - n;
    return {
      ok: true,
      mensaje:
        `${n} canal(es) con umbral declarado` +
        (sin > 0 ? `, ${sin} sin criterio` : '') +
        '. Reiniciá el servidor para que la vista los tome.',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * La distribución REAL de alcance de un canal, para poder elegir el umbral
 * mirando los datos en vez de adivinando.
 *
 * Devuelve `null` cuando el canal no tiene piezas medidas: ahí no hay percentil
 * que calcular, y mostrar un cero sugeriría que el alcance es cero.
 */
// El discriminante es `hay` y no `medidas === 0`: con `medidas: number` en una
// rama y `medidas: 0` en la otra, TypeScript no puede estrechar la unión —
// `number` incluye al 0— y el consumidor termina con `p90` posiblemente ausente.
export type Distribucion =
  | { hay: false; canal: string; total: number }
  | {
      hay: true;
      canal: string;
      medidas: number;
      total: number;
      mediana: number;
      p75: number;
      p90: number;
      max: number;
    };

export function distribucionDe(
  canal: string,
  alcances: number[],
  total: number,
): Distribucion {
  if (alcances.length === 0) return { hay: false, canal, total };
  const a = [...alcances].sort((x, y) => x - y);
  const pct = (q: number) => a[Math.min(a.length - 1, Math.floor(a.length * q))];
  return {
    hay: true,
    canal,
    medidas: a.length,
    total,
    mediana: pct(0.5),
    p75: pct(0.75),
    p90: pct(0.9),
    max: a[a.length - 1],
  };
}

export function umbralesActuales(): Umbrales {
  try {
    const config = JSON.parse(readFileSync(ruta(), 'utf8')) as Config;
    return (config.por_canal ?? {}) as Umbrales;
  } catch {
    return {};
  }
}
