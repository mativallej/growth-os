import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PiezasClient, { type PiezaCard } from "@/components/PiezasClient";
import type { Opcion } from "@/components/Filtros";
import { loadPieces } from "@/lib/parse";
import { latest, engRate, saveLike, primaryReach, num, pct } from "@/lib/metrics";
import { sparkline } from "@/lib/charts";
import { findSource } from "@/lib/sources";
import { loadFormulas } from "@/lib/formulas";
import { loadCreatives } from "@/lib/ads";
import { formulaCodeOf } from "@/lib/formulas";

const conteo = (vals: string[]): Opcion[] => {
  const m = new Map<string, number>();
  for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
};

export default async function PiezasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;
  const pieces = loadPieces([source]).filter((p) => p.coverage === "tracked");

  const cards: PiezaCard[] = pieces.map((p) => {
    const l = latest(p)!;
    const alcance = primaryReach(p);
    const code = formulaCodeOf(p, catalogo) ?? "";
    // La serie del sparkline usa el alcance que corresponde al canal: en
    // Instagram `impressions` no existe y la línea salía plana en cero.
    const serie = p.snapshots.map((s) => ({
      label: s.t,
      value: s.impressions ?? s.views ?? s.reach ?? 0,
    }));
    return {
      title: p.title,
      href: `/${account}/piezas/${p.slug}`,
      canal: p.channel,
      cuenta: p.cuenta ?? "",
      formula: p.formula ?? "",
      formulaCode: code,
      coverage: p.coverage,
      publishedAt: p.publishedAt ?? "",
      verdict: p.verdict ?? "",
      sparkHtml: sparkline(serie),
      cortes: p.snapshots.length,
      alcance,
      alcanceFmt: num(alcance),
      engRate: pct(engRate(l)),
      saveLike: pct(saveLike(l)),
      follows: num(l.follows),
      search: `${p.title} ${p.canal ?? ""} ${p.formula ?? ""} ${p.cuenta ?? ""}`.toLowerCase(),
    };
  });

  return (
    <>
      <PageHeader
        title="Piezas"
        subtitle={`${source.label} · ${cards.length} con métricas`}
      />
      <PiezasClient
        cards={cards}
        canales={conteo(cards.map((c) => c.canal))}
        formulas={conteo(cards.map((c) => c.formulaCode))}
        creativosSinMedir={loadCreatives([source]).length}
        hrefCampanas={`/${account}/campanas`}
      />
    </>
  );
}
