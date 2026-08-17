import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { sumLatest, countBy, topN, num } from "@/lib/metrics";

const withBars = (items: { label: string; value: number }[]) => {
  const max = Math.max(...items.map((i) => i.value), 1);
  return items.map((i) => ({ ...i, pct: (i.value / max) * 100 }));
};

// Fórmulas son POR RED (IG = A-K, Twitter = X1-X10). Extraigo el código líder
// del campo `formula` y agrupo por canal. Códigos nuevos entran solos.
const formulaCode = (f?: string): string => {
  if (!f) return "s/f";
  const seg = f.split("·")[0].trim();
  return seg.split(/\s+/)[0].trim() || "s/f";
};

export default function OverviewPage() {
  const pieces = loadPieces();
  const withA = pieces.filter((p) => p.snapshots.length > 0);
  const published = pieces.filter((p) => (p.estado ?? "").toLowerCase().includes("public")).length;

  const kpis = [
    { k: "Piezas", v: num(pieces.length) },
    { k: "Publicadas", v: num(published) },
    { k: "Con analytics", v: num(withA.length) },
    { k: "Impressions Σ", v: num(sumLatest(withA, "impressions")) },
    { k: "Follows Σ", v: num(sumLatest(withA, "follows")), good: true },
    { k: "Bookmarks Σ", v: num(sumLatest(withA, "bookmarks")) },
  ];

  const distros = [
    { title: "Por canal", items: withBars(topN(countBy(pieces, "canal"), 6)) },
    { title: "Por estado", items: withBars(topN(countBy(pieces, "estado"), 6)) },
  ];

  const formulasByNet = Object.entries(countBy(pieces, "canal"))
    .filter(([canal, n]) => canal !== "—" && n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([canal]) => {
      const counts: Record<string, number> = {};
      for (const p of pieces.filter((x) => (x.canal ?? "") === canal)) {
        const c = formulaCode(p.formula);
        counts[c] = (counts[c] ?? 0) + 1;
      }
      return { net: canal, items: withBars(topN(counts, 8)) };
    });

  return (
    <>
      <PageHeader title="Overview" subtitle="Métricas de contenido — lee Brand/Content, sin API" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpis.map((t) => (
          <Card key={t.k}>
            <CardContent className="p-4">
              <div className="text-[11px] text-muted-foreground">{t.k}</div>
              <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${t.good ? "text-[var(--tg-green)]" : ""}`}>
                {t.v}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Distribución</div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {distros.map((g) => (
          <Card key={g.title}>
            <CardContent className="p-5">
              <h3 className="mb-4 text-xs font-medium text-muted-foreground">{g.title}</h3>
              <div className="space-y-2.5">
                {g.items.map((it) => (
                  <div key={it.label} className="flex items-center gap-3 text-[13px]">
                    <span className="w-28 shrink-0 truncate text-muted-foreground">{it.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${it.pct}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">{it.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Fórmulas por red <span className="normal-case tracking-normal text-muted-foreground/50">· IG usa A-K, Twitter X1-X10</span>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {formulasByNet.map((g) => (
          <Card key={g.net}>
            <CardContent className="p-5">
              <h3 className="mb-4 text-xs font-medium text-muted-foreground">{g.net}</h3>
              <div className="space-y-2.5">
                {g.items.map((it) => (
                  <div key={it.label} className="flex items-center gap-3 text-[13px]">
                    <span className="w-24 shrink-0 truncate font-mono text-muted-foreground">{it.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${it.pct}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">{it.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
