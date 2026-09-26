// Line chart minimalista, SVG server-rendered (sin librería, sin JS).
//
// Los colores son los del tema (ink + greys de --tg-*), no el violeta que venía
// del tema anterior: un gráfico con una paleta que no existe en ningún otro
// lado se lee como si midiera otra cosa.
// Eje x = índice de snapshot (equiespaciado, etiquetado con `t`), y = valor.

type Pt = { label: string; value: number };

const fmt = (v: number) =>
  v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(v);

export function lineChart(pts: Pt[]): string {
  const w = 720;
  const h = 190;
  const pl = 10;
  const pr = 10;
  const pt = 26;
  const pb = 26;
  const iw = w - pl - pr;
  const ih = h - pt - pb;
  const n = pts.length;
  const max = Math.max(...pts.map((p) => p.value), 1);
  const x = (i: number) => pl + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pt + ih - (v / max) * ih;

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)} ${pt + ih} L${x(0).toFixed(1)} ${pt + ih} Z`;

  const dots = pts
    .map(
      (p, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3" fill="hsl(240 11% 98%)" stroke="hsl(253 26% 10%)" stroke-width="1.5"/>` +
        `<text x="${x(i).toFixed(1)}" y="${(y(p.value) - 10).toFixed(1)}" text-anchor="middle" fill="hsl(258 11% 37%)" font-size="10" font-family="ui-monospace,monospace">${fmt(p.value)}</text>`
    )
    .join('');

  const labels = pts
    .map(
      (p, i) =>
        `<text x="${x(i).toFixed(1)}" y="${h - 8}" text-anchor="middle" fill="hsl(258 11% 37%)" font-size="10">${p.label}</text>`
    )
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img">
    <path d="${area}" fill="hsl(253 26% 10%)" fill-opacity="0.07"/>
    <path d="${line}" fill="none" stroke="hsl(253 26% 10%)" stroke-width="1.75" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}
