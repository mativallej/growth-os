// SVG server-rendered, sin librería y sin JS de cliente.
//
// LA REGLA QUE ESTE ARCHIVO APRENDIÓ A LA MALA: con menos de dos cortes NO HAY
// GRÁFICO. Había uno de 720×190 que con una sola medición dibujaba una caja
// enorme y vacía con un puntito en el medio — media pantalla de una tarjeta
// gastada en decir un número que ya estaba escrito al lado. Un valor suelto es
// un dato, no una serie: se muestra como número.
//
// Y no se etiqueta cada punto: un número al lado de cada dot es ruido que nadie
// lee. Se etiqueta el último, que es el valor vigente.

type Pt = { label: string; value: number };

const fmt = (v: number) =>
  v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(v);

const TINTA = 'hsl(253 26% 10%)';
const TINTA_2 = 'hsl(258 11% 37%)';
const SUPERFICIE = 'hsl(240 11% 98%)';

function geometria(pts: Pt[], w: number, h: number, pad: { t: number; r: number; b: number; l: number }) {
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = pts.length;
  const max = Math.max(...pts.map((p) => p.value), 1);
  const min = Math.min(...pts.map((p) => p.value), 0);
  const rango = max - min || 1;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / rango) * ih;
  return { x, y, iw, ih, n, base: pad.t + ih };
}

/**
 * Sparkline: la forma de la serie al lado del número, sin ejes ni etiquetas.
 * Para una fila o una tarjeta, donde el espacio es el precio de estar.
 * Devuelve `null` con menos de dos puntos — que es cuándo no hay forma que mostrar.
 */
export function sparkline(pts: Pt[], w = 108, h = 26): string | null {
  if (pts.length < 2) return null;
  const { x, y, base } = geometria(pts, w, h, { t: 3, r: 3, b: 3, l: 3 });
  const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(pts.length - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`;
  const ult = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Evolución: ${pts.map((p) => `${p.label} ${p.value}`).join(', ')}" style="display:block;overflow:visible">
    <path d="${area}" fill="${TINTA}" fill-opacity="0.06"/>
    <path d="${linea}" fill="none" stroke="${TINTA}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(ult.value).toFixed(1)}" r="2" fill="${TINTA}"/>
  </svg>`;
}

/**
 * Gráfico de línea para la vista de detalle, donde sí hay lugar para ejes.
 * Devuelve `null` con menos de dos puntos: la vista muestra el número en su lugar.
 */
export function lineChart(pts: Pt[], w = 720, h = 168): string | null {
  if (pts.length < 2) return null;
  const { x, y, base, n } = geometria(pts, w, h, { t: 22, r: 12, b: 24, l: 12 });

  const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(n - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`;

  // Marcas finas, con un anillo del color de la superficie para que el punto se
  // despegue de la línea sin engordarla.
  const dots = pts
    .map((p, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2.5" fill="${TINTA}" stroke="${SUPERFICIE}" stroke-width="1.5"/>`
    )
    .join('');

  // Etiqueta SELECTIVA: el último valor y el máximo si no son el mismo punto.
  const iMax = pts.reduce((m, p, i) => (p.value > pts[m].value ? i : m), 0);
  const marcados = [...new Set([n - 1, iMax])];
  const etiquetas = marcados
    .map((i) => {
      const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      return `<text x="${x(i).toFixed(1)}" y="${(y(pts[i].value) - 9).toFixed(1)}" text-anchor="${anchor}" fill="${TINTA}" font-size="11" font-weight="500" font-family="ui-monospace,monospace">${fmt(pts[i].value)}</text>`;
    })
    .join('');

  // Solo el primero y el último horizonte en el eje: con 6 cortes las etiquetas
  // se pisan y ninguna se lee.
  const ejes = [0, n - 1]
    .map((i) => {
      const anchor = i === 0 ? 'start' : 'end';
      return `<text x="${x(i).toFixed(1)}" y="${h - 7}" text-anchor="${anchor}" fill="${TINTA_2}" font-size="10">${pts[i].label}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img" aria-label="Evolución en ${n} cortes, de ${fmt(pts[0].value)} a ${fmt(pts[n - 1].value)}">
    <line x1="12" y1="${base}" x2="${w - 12}" y2="${base}" stroke="${TINTA_2}" stroke-opacity="0.18" stroke-width="1"/>
    <path d="${area}" fill="${TINTA}" fill-opacity="0.05"/>
    <path d="${linea}" fill="none" stroke="${TINTA}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${etiquetas}${ejes}
  </svg>`;
}
