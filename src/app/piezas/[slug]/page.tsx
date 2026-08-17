import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { sortedSnaps, latest, engRate, pvRate, saveLike, num, pct } from "@/lib/metrics";
import { lineChart } from "@/lib/charts";

export function generateStaticParams() {
  return loadPieces().map((p) => ({ slug: p.slug }));
}

const verdictVariant = (v?: string): "success" | "destructive" | "secondary" => {
  const s = (v ?? "").toLowerCase();
  if (["breakout", "strong", "solid"].includes(s)) return "success";
  if (["weak", "flop"].includes(s)) return "destructive";
  return "secondary";
};

export default async function PiezaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = loadPieces().find((x) => x.slug === slug);
  if (!p) notFound();

  const snaps = sortedSnaps(p);
  const l = latest(p);
  const chart = snaps.length ? lineChart(snaps.map((s) => ({ label: s.t, value: s.impressions ?? 0 }))) : null;

  const derived = l
    ? [
        { k: "Impressions", v: num(l.impressions) },
        { k: "Eng rate", v: pct(engRate(l)) },
        { k: "Profile visits", v: `${num(l.profileVisits)} · ${pct(pvRate(l))}` },
        { k: "Save / like", v: pct(saveLike(l)), good: true },
        { k: "Follows", v: num(l.follows), good: true },
        { k: "Shares", v: num(l.shares) },
      ]
    : [];

  return (
    <>
      <PageHeader title={p.title} subtitle={[p.canal, p.cuenta, p.formato].filter(Boolean).join(" · ")} />

      <Link href="/piezas" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
        ← Piezas
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.formula && <Badge variant="outline">{p.formula}</Badge>}
        {p.estado && (
          <Badge variant={(p.estado ?? "").toLowerCase().includes("public") ? "success" : "secondary"}>{p.estado}</Badge>
        )}
        {p.verdict && <Badge variant={verdictVariant(p.verdict)}>{p.verdict}</Badge>}
      </div>

      {p.tldr && <p className="mt-4 max-w-[74ch] text-[13px] leading-relaxed text-muted-foreground">{p.tldr}</p>}

      <Card className="mt-5">
        <CardContent className="p-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{p.body}</div>
        </CardContent>
      </Card>

      {l && (
        <>
          <div className="mt-6 rounded-lg border border-border p-3">
            <div className="mb-1 px-1 text-[11px] text-muted-foreground">Impressions en el tiempo</div>
            {chart && <div dangerouslySetInnerHTML={{ __html: chart }} />}
          </div>

          <div className="my-5 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3 md:grid-cols-6">
            {derived.map((d) => (
              <div key={d.k}>
                <div className="text-[11px] text-muted-foreground">{d.k}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${d.good ? "text-[var(--tg-green)]" : ""}`}>{d.v}</div>
              </div>
            ))}
          </div>

          <Table className="font-mono text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>corte</TableHead>
                <TableHead className="text-right">imp</TableHead>
                <TableHead className="text-right">eng</TableHead>
                <TableHead className="text-right">detail</TableHead>
                <TableHead className="text-right">pv</TableHead>
                <TableHead className="text-right">likes</TableHead>
                <TableHead className="text-right">rt</TableHead>
                <TableHead className="text-right">bmk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snaps.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-primary">{s.t}</TableCell>
                  <TableCell className="text-right">{num(s.impressions)}</TableCell>
                  <TableCell className="text-right">{num(s.engagements)}</TableCell>
                  <TableCell className="text-right">{num(s.detailExpands)}</TableCell>
                  <TableCell className="text-right">{num(s.profileVisits)}</TableCell>
                  <TableCell className="text-right">{num(s.likes)}</TableCell>
                  <TableCell className="text-right">{num(s.reposts)}</TableCell>
                  <TableCell className="text-right">{num(s.bookmarks)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {(p.verdict || p.why || (p.drivers && p.drivers.length > 0)) && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Análisis</span>
            {p.verdict && <Badge variant={verdictVariant(p.verdict)}>{p.verdict}</Badge>}
          </div>
          {p.drivers && p.drivers.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {p.drivers.map((d) => (
                <Badge key={d} variant="outline">
                  {d}
                </Badge>
              ))}
            </div>
          )}
          {p.why && <p className="text-[13px] leading-relaxed text-muted-foreground">{p.why}</p>}
          {p.lesson && (
            <p className="mt-2 text-[13px] leading-relaxed">
              <span className="text-muted-foreground">Lección: </span>
              {p.lesson}
            </p>
          )}
        </div>
      )}

      {p.note && (
        <p className="mt-5 border-l border-border pl-3.5 text-xs leading-relaxed text-muted-foreground">{p.note}</p>
      )}

      <div className="mt-8 text-[11px] text-muted-foreground/60">
        <code>{p.relPath}</code>
      </div>
    </>
  );
}
