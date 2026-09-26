import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PiezasClient, { type PiezaCard } from "@/components/PiezasClient";
import { loadPieces } from "@/lib/parse";
import { latest, engRate, pvRate, saveLike, primaryReach, num, pct } from "@/lib/metrics";
import { lineChart } from "@/lib/charts";
import { findSource } from "@/lib/sources";

export default async function PiezasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  // Se ordena por ALCANCE PRIMARIO, no por impressions: Instagram no reporta
  // impressions, y ordenar por ese campo mandaba todas sus piezas al fondo con
  // un cero que no era un cero.
  const pieces = loadPieces([source])
    .filter((p) => p.coverage === "tracked")
    .sort((a, b) => (primaryReach(b) ?? 0) - (primaryReach(a) ?? 0));

  const nets = Array.from(new Set(pieces.map((p) => p.canal).filter(Boolean))) as string[];

  const cards: PiezaCard[] = pieces.map((p) => {
    const l = latest(p)!;
    return {
      title: p.title,
      href: `/${account}/piezas/${p.slug}`,
      canal: p.canal ?? "",
      meta: [p.canal, p.cuenta, p.formato].filter(Boolean).join(" · "),
      verdict: p.verdict ?? "",
      formula: p.formula ?? "",
      chartHtml: lineChart(p.snapshots.map((s) => ({ label: s.t, value: primaryReach(p) != null ? (s.impressions ?? s.views ?? s.reach ?? 0) : 0 }))),
      stats: [
        { k: "Alcance", v: num(primaryReach(p)) },
        { k: "Eng rate", v: pct(engRate(l)) },
        { k: "PV", v: `${num(l.profileVisits)} · ${pct(pvRate(l))}` },
        { k: "Save/like", v: pct(saveLike(l)), good: true },
        { k: "Follows", v: num(l.follows), good: true },
      ],
    };
  });

  return (
    <>
      <PageHeader title="Piezas" subtitle={`${source.label} · ${pieces.length} pieza(s) con métricas`} />
      <PiezasClient cards={cards} nets={nets} />
    </>
  );
}
