import PageHeader from "@/components/PageHeader";
import PiezasClient, { type PiezaCard } from "@/components/PiezasClient";
import { loadPieces } from "@/lib/parse";
import { latest, engRate, pvRate, saveLike, num, pct } from "@/lib/metrics";
import { lineChart } from "@/lib/charts";

export default function PiezasPage() {
  const pieces = loadPieces()
    .filter((p) => p.snapshots.length > 0)
    .sort((a, b) => (latest(b)?.impressions ?? 0) - (latest(a)?.impressions ?? 0));

  const nets = Array.from(new Set(pieces.map((p) => p.canal).filter(Boolean))) as string[];

  const cards: PiezaCard[] = pieces.map((p) => {
    const l = latest(p)!;
    return {
      title: p.title,
      slug: p.slug,
      canal: p.canal ?? "",
      meta: [p.canal, p.cuenta, p.formato].filter(Boolean).join(" · "),
      verdict: p.verdict ?? "",
      formula: p.formula ?? "",
      chartHtml: lineChart(p.snapshots.map((s) => ({ label: s.t, value: s.impressions ?? 0 }))),
      stats: [
        { k: "Impressions", v: num(l.impressions) },
        { k: "Eng rate", v: pct(engRate(l)) },
        { k: "PV", v: `${num(l.profileVisits)} · ${pct(pvRate(l))}` },
        { k: "Save/like", v: pct(saveLike(l)), good: true },
        { k: "Follows", v: num(l.follows), good: true },
      ],
    };
  });

  return (
    <>
      <PageHeader title="Piezas" subtitle={`${pieces.length} pieza(s) con analytics`} />
      <PiezasClient cards={cards} nets={nets} />
    </>
  );
}
