import type { Piece } from './types';
import type { Creative } from './ads';
import { engRate, latest, num, pct, primaryReach, saveLike } from './metrics';
import { sparkline } from './charts';
import { formulaCodeOf, type Formula } from './formulas';
import type { Corte, Unidad } from './unidades';
import { nivelDe, type Nivel, type Umbrales } from './viralidad';

// Los constructores de `Unidad`, SEPARADOS del tipo.
//
// `unidades.ts` lo importan componentes de cliente, y estos constructores
// dependen de `formulas.ts`, que lee el catálogo del vault con `node:fs`.
// Tenerlos juntos arrastraba `node:fs` al bundle del navegador y volteaba el
// build con un error de Turbopack que no nombraba la causa.

const VACIO = {
  formulaCode: '',
  nivel: 'sin-medir' as Nivel,
  coverage: '',
  cortes: 0,
  estado: '',
  status: '',
  alcance: null,
  engagements: null,
  bookmarks: null,
  likes: null,
  follows: null,
  persona: '',
  publico: '',
  dolor: '',
  angulo: '',
  ronda: '',
  formato: '',
  derivadas: '',
  formula: '',
  cuenta: '',
  verdict: '',
  sparkHtml: null,
  cortesDetalle: [] as Corte[],
  alcanceFmt: '—',
  engRate: '—',
  saveLike: '—',
  followsFmt: '—',
  url: '',
  driveUrl: '',
};

/** La ruta sin el archivo: `Create/Organic/X/X4 - Builder`. `''` en la raíz. */
function carpetaDe(relPath: string): string {
  return relPath.split(/[\\/]/).slice(0, -1).join('/');
}

export function dePieza(
  p: Piece,
  account: string,
  catalogo: Formula[],
  umbrales: Umbrales = {},
): Unidad {
  const l = latest(p);
  const alcance = primaryReach(p);
  return {
    ...VACIO,
    tipo: 'organico',
    // El `id` primero: es la llave que sobrevive a que el archivo se mueva, y
    // los favoritos se guardan con ella.
    llave: p.id ?? p.slug,
    title: p.title,
    href: `/${account}/piezas/${p.slug}`,
    canal: p.channel,
    carpeta: carpetaDe(p.relPath),
    publishedAt: p.publishedAt ?? '',
    search: `${p.title} ${p.canal ?? ''} ${p.formula ?? ''} ${p.estado ?? ''} ${p.cuenta ?? ''}`.toLowerCase(),
    formulaCode: formulaCodeOf(p, catalogo) ?? '',
    coverage: p.coverage,
    cortes: p.snapshots.length,
    estado: p.estado ?? '',
    status: p.status,
    alcance,
    nivel: nivelDe(alcance, p.channel, umbrales),
    engagements: l?.engagements ?? null,
    bookmarks: l?.bookmarks ?? null,
    likes: l?.likes ?? null,
    follows: l?.follows ?? null,
    formula: p.formula ?? '',
    cuenta: p.cuenta ?? '',
    verdict: p.verdict ?? '',
    // La serie usa el alcance que corresponde al canal: en Instagram
    // `impressions` no existe y la línea salía plana en cero.
    sparkHtml: sparkline(
      p.snapshots.map((s) => ({ label: s.t, value: s.impressions ?? s.views ?? s.reach ?? 0 })),
    ),
    // EN EL ORDEN DEL ARCHIVO, que es el orden en que se midió. Ordenarlos por
    // fecha rompería los cortes sin fecha —hay 35 piezas así— mandándolos todos
    // al mismo lugar, y el orden del vault ya es cronológico por construcción.
    cortesDetalle: p.snapshots.map<Corte>((sn) => ({
      t: sn.t,
      fecha: sn.date ?? '—',
      cuenta: sn.account ?? '',
      // El alcance primario del canal: en Instagram `impressions` no existe, y
      // leer solo esa clave dejaba la columna en blanco para media biblioteca.
      alcance: num(sn.impressions ?? sn.views ?? sn.reach),
      engagements: num(sn.engagements),
      engRate: pct(engRate(sn)),
      likes: num(sn.likes),
      guardados: num(sn.bookmarks),
      follows: num(sn.follows),
    })),
    alcanceFmt: num(alcance),
    engRate: l ? pct(engRate(l)) : '—',
    saveLike: l ? pct(saveLike(l)) : '—',
    followsFmt: l ? num(l.follows) : '—',
    url: p.url ?? '',
    driveUrl: p.driveUrl ?? '',
  };
}

export function deCreativo(c: Creative, account: string): Unidad {
  return {
    ...VACIO,
    tipo: 'ads',
    llave: c.slug,
    title: c.title,
    href: `/${account}/campanas`,
    canal: 'meta-ads',
    carpeta: carpetaDe(c.relPath),
    publishedAt: '',
    search: `${c.title} ${c.persona ?? ''} ${c.angulo ?? ''} ${c.formato ?? ''} ${c.ronda ?? ''}`.toLowerCase(),
    // Un creativo NO tiene la cobertura de medición del orgánico: al 2026-09-26
    // ninguno tiene un solo número, son briefs. Dejarlo en `untracked` lo haría
    // aparecer en la deuda de medición junto a las piezas, y esa es otra deuda.
    // Su nivel queda en 'sin-medir' por lo mismo, y no porque falte el umbral:
    // un creativo no se mide con las métricas del orgánico ni en principio.
    estado: c.estado ?? '',
    persona: c.persona ?? '',
    publico: c.publico ?? '',
    dolor: c.dolor ?? '',
    angulo: c.angulo ?? '',
    ronda: c.ronda ?? '',
    formato: c.formato ?? '',
    derivadas: c.derivadas.join(' · '),
  };
}
