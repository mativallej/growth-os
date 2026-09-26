import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RankingClient, { type RankFila } from "@/components/RankingClient";
import type { Opcion } from "@/components/MultiSelect";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { latest, primaryReach } from "@/lib/metrics";
import { formulaCodeOf, loadFormulas } from "@/lib/formulas";
import { loadCreatives } from "@/lib/ads";

const conteo = (vals: string[]): Opcion[] => {
  const m = new Map<string, number>();
  for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
};

export default async function RankingPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;
  const filas: RankFila[] = loadPieces([source]).map((p) => {
    const l = latest(p);
    return {
      title: p.title,
      href: `/${account}/piezas/${p.slug}`,
      canal: p.channel,
      formulaCode: formulaCodeOf(p, catalogo) ?? "",
      coverage: p.coverage,
      publishedAt: p.publishedAt ?? "",
      search: `${p.title} ${p.canal ?? ""} ${p.formula ?? ""}`.toLowerCase(),
      alcance: primaryReach(p),
      engagements: l?.engagements ?? null,
      bookmarks: l?.bookmarks ?? null,
      likes: l?.likes ?? null,
      follows: l?.follows ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Ranking"
      />
      <RankingClient
        filas={filas}
        canales={conteo(filas.map((r) => r.canal))}
        formulas={conteo(filas.map((r) => r.formulaCode))}
        creativos={loadCreatives([source]).length}
        hrefCampanas={`/${account}/campanas`}
      />
    </>
  );
}
