import { notFound } from "next/navigation";
import OverviewClient, { type OverviewPiece } from "@/components/OverviewClient";
import { loadPieces } from "@/lib/parse";
import { latest, primaryReach } from "@/lib/metrics";
import { findSource } from "@/lib/sources";
import { formulaCodeOf, loadFormulas } from "@/lib/formulas";
import { formulaUsage } from "@/lib/rollups";
import { dietaDe } from "@/lib/cadencia";

// La antigüedad se congela al momento del BUILD, no del render: estas páginas
// son estáticas, así que "hoy" es cuándo se generaron. Calcularlo en el cliente
// haría que el número dependa del reloj de cada navegador, y dos personas verían
// deudas distintas sobre los mismos datos.
const GENERADO = Date.now();

export default async function OverviewPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;
  const pieces = loadPieces([source]);
  const { unused, unclassified } = formulaUsage(pieces, catalogo);

  // Proyección mínima. El `body` de ninguna pieza viaja al cliente.
  const piezas: OverviewPiece[] = pieces.map((p) => {
    const l = latest(p);
    const t = p.publishedAt ? Date.parse(p.publishedAt + "T00:00:00Z") : NaN;
    return {
      href: `/${account}/piezas/${p.slug}`,
      canal: p.channel,
      status: p.status,
      coverage: p.coverage,
      publishedAt: p.publishedAt ?? "",
      formulaCode: formulaCodeOf(p, catalogo) ?? "",
      impressions: l?.impressions ?? null,
      views: primaryReach(p) != null && l?.impressions == null ? (l?.views ?? l?.reach ?? null) : null,
      follows: l?.follows ?? null,
      bookmarks: l?.bookmarks ?? null,
      dias: Number.isNaN(t) ? null : Math.floor((GENERADO - t) / 86_400_000),
      sinEnlace: !p.url,
    };
  });

  return (
    <OverviewClient
      piezas={piezas}
      account={account}
      label={source.label}
      dieta={dietaDe(source.brand)}
      formulasSinEstrenar={unused.map((f) => f.code)}
      sinClasificar={unclassified}
    />
  );
}
