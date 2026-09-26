import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import BarList from "@/components/BarList";
import { loadPieces } from "@/lib/parse";
import { sumLatest, countBy, topN, num } from "@/lib/metrics";
import { findSource } from "@/lib/sources";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  // Se carga UNA fuente, no todas filtradas. La diferencia está en lo que viaja
  // al cliente: acá las piezas de la otra marca no se leen siquiera.
  const pieces = loadPieces([source]);
  const conCortes = pieces.filter((p) => p.coverage === "tracked");
  const publicadas = pieces.filter((p) => p.status === "published");

  const kpis = [
    { k: "Piezas", v: num(pieces.length) },
    { k: "Publicadas", v: num(publicadas.length) },
    { k: "Medidas", v: num(conCortes.length) },
    { k: "Impressions Σ", v: num(sumLatest(conCortes, "impressions")) },
    { k: "Follows Σ", v: num(sumLatest(conCortes, "follows")), good: true },
    { k: "Bookmarks Σ", v: num(sumLatest(conCortes, "bookmarks")) },
  ];

  const distros = [
    { title: "Por canal", items: topN(countBy(pieces, "channel"), 6) },
    { title: "Por estado", items: topN(countBy(pieces, "status"), 6) },
  ];

  // Las fórmulas son POR RED (IG usa A-K, X usa X1-X10), así que agrupar todas
  // juntas mezcla dos catálogos distintos. El código lo separa `formulaCode`.
  const formulasPorRed = Object.entries(countBy(pieces, "channel"))
    .filter(([canal, n]) => canal !== "unknown" && canal !== "—" && n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([canal]) => {
      const counts: Record<string, number> = {};
      for (const p of pieces.filter((x) => x.channel === canal)) {
        const c = p.formulaCode ?? "s/f";
        counts[c] = (counts[c] ?? 0) + 1;
      }
      return { net: canal, items: topN(counts, 8) };
    });

  return (
    <>
      <PageHeader title="Overview" subtitle={`${source.label} · ${pieces.length} piezas`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpis.map((t) => (
          <Card key={t.k}>
            <CardContent className="p-4">
              <div className="text-[11px] text-muted-foreground">{t.k}</div>
              <div
                className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${
                  t.good ? "text-[var(--tg-green)]" : ""
                }`}
              >
                {t.v}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Distribución
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {distros.map((g) => (
          <Card key={g.title}>
            <CardContent className="p-5">
              <h3 className="mb-4 text-xs font-medium text-muted-foreground">{g.title}</h3>
              <BarList items={g.items} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Fórmulas por red{" "}
        <span className="normal-case tracking-normal text-muted-foreground/50">
          · cada red tiene su propio catálogo
        </span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {formulasPorRed.map((g) => (
          <Card key={g.net}>
            <CardContent className="p-5">
              <h3 className="mb-4 text-xs font-medium text-muted-foreground">{g.net}</h3>
              <BarList items={g.items} labelClassName="w-24 font-mono" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
