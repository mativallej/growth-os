import type { Piece } from './types';
import type { Creative } from './ads';
import { latest, primaryReach } from './metrics';
import { formulaCodeOf, type Formula } from './formulas';
import type { Unidad } from './unidades';

// Los constructores de `Unidad`, SEPARADOS del tipo.
//
// `unidades.ts` lo importan componentes de cliente, y estos constructores
// dependen de `formulas.ts`, que lee el catálogo del vault con `node:fs`.
// Tenerlos juntos arrastraba `node:fs` al bundle del navegador y volteaba el
// build con un error de Turbopack que no nombraba la causa.

const VACIO = {
  formulaCode: '',
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
};

export function dePieza(p: Piece, account: string, catalogo: Formula[]): Unidad {
  const l = latest(p);
  return {
    ...VACIO,
    tipo: 'organico',
    title: p.title,
    href: `/${account}/piezas/${p.slug}`,
    canal: p.channel,
    publishedAt: p.publishedAt ?? '',
    search: `${p.title} ${p.canal ?? ''} ${p.formula ?? ''} ${p.estado ?? ''}`.toLowerCase(),
    formulaCode: formulaCodeOf(p, catalogo) ?? '',
    coverage: p.coverage,
    cortes: p.snapshots.length,
    estado: p.estado ?? '',
    status: p.status,
    alcance: primaryReach(p),
    engagements: l?.engagements ?? null,
    bookmarks: l?.bookmarks ?? null,
    likes: l?.likes ?? null,
    follows: l?.follows ?? null,
  };
}

export function deCreativo(c: Creative, account: string): Unidad {
  return {
    ...VACIO,
    tipo: 'ads',
    title: c.title,
    href: `/${account}/campanas`,
    canal: 'meta-ads',
    publishedAt: '',
    search: `${c.title} ${c.persona ?? ''} ${c.angulo ?? ''} ${c.formato ?? ''} ${c.ronda ?? ''}`.toLowerCase(),
    // Un creativo NO tiene la cobertura de medición del orgánico: al 2026-09-26
    // ninguno tiene un solo número, son briefs. Dejarlo en `untracked` lo haría
    // aparecer en la deuda de medición junto a las piezas, y esa es otra deuda.
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
