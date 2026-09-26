import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RankingClient, { type RankGroup } from "@/components/RankingClient";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { rankBy, type RankMetric } from "@/lib/rollups";
import { num, pct } from "@/lib/metrics";

const METRICAS: { metric: RankMetric; label: string }[] = [
  { metric: "reach", label: "Alcance" },
  { metric: "engagements", label: "Engagements" },
  { metric: "bookmarks", label: "Guardados" },
  { metric: "likes", label: "Likes" },
  { metric: "follows", label: "Follows" },
];

const TOPE = 30;

export default async function RankingPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);

  const groups: RankGroup[] = METRICAS.map(({ metric, label }) => ({
    metric,
    label,
    rows: rankBy(pieces, metric)
      .slice(0, TOPE)
      .map((r) => ({
        title: r.piece.title,
        href: `/${account}/piezas/${r.piece.slug}`,
        channel: r.piece.channel,
        value: num(r.value),
        // La tasa sobre el alcance es `—` cuando falta cualquiera de los dos:
        // dividir por un alcance que no se midió daría un número inventado.
        rate: metric === "reach" ? "—" : pct(r.rate),
      })),
  }));

  return (
    <>
      <PageHeader
        title="Ranking"
        subtitle={`${source.label} · en absoluto y en tasa sobre el alcance`}
      />
      <RankingClient groups={groups} />
      <p className="mt-4 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
        Las dos columnas porque cada una sola miente: el absoluto premia a la pieza que
        tuvo alcance y no movió a nadie, y la tasa premia a la que movió a los pocos que
        la vieron. Una pieza de utilidad gana en guardados con alcance mediocre, y eso
        solo se ve mirando las dos juntas.
      </p>
    </>
  );
}
