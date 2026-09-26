import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import BarList from "@/components/BarList";
import { loadPieces } from "@/lib/parse";
import { countBy, num, sumLatest } from "@/lib/metrics";
import { findSource } from "@/lib/sources";
import { loadFormulas } from "@/lib/formulas";
import { analyticsDebt, cadenceByMonth, formulaUsage } from "@/lib/rollups";

const PISO = 10;

/** Un número grande con su etiqueta. La forma correcta para un valor suelto. */
function Stat({ k, v, sub, good }: { k: string; v: string; sub?: string; good?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{k}</div>
        <div
          className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${
            good ? "text-[var(--tg-green)]" : ""
          }`}
        >
          {v}
        </div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);
  const medidas = pieces.filter((p) => p.coverage === "tracked");
  const publicadas = pieces.filter((p) => p.status === "published");

  const cadencia = cadenceByMonth(pieces);
  const deuda = analyticsDebt(pieces);
  const { unused, unclassified } = formulaUsage(pieces, loadFormulas().formulas);
  const ultimoMes = cadencia.months[cadencia.months.length - 1];
  const masVieja = deuda.find((d) => d.days !== null)?.days ?? null;

  // Lo que requiere una decisión, con el link a la vista donde se resuelve.
  // Un overview que solo describe no sirve: la pregunta es qué hacer hoy.
  const atencion = [
    deuda.length > 0 && {
      href: `/${account}/deuda`,
      titulo: `${num(deuda.length)} publicadas sin medir`,
      detalle:
        masVieja !== null
          ? `la más vieja hace ${num(masVieja)} días`
          : "ninguna declara desde cuándo",
    },
    ultimoMes && ultimoMes.count < PISO && {
      href: `/${account}/cadencia`,
      titulo: `${ultimoMes.month}: ${ultimoMes.count} piezas`,
      detalle: `faltan ${PISO - ultimoMes.count} para el piso de ${PISO}`,
    },
    cadencia.undated > 0 && {
      href: `/${account}/cadencia`,
      titulo: `${num(cadencia.undated)} publicadas sin fecha`,
      detalle: "no entran en ninguna cadencia",
    },
    unused.length > 0 && {
      href: `/${account}/formulas`,
      titulo: `${num(unused.length)} fórmulas sin estrenar`,
      detalle: unused.slice(0, 6).map((f) => f.code).join(" · "),
    },
    unclassified > 0 && {
      href: `/${account}/formulas`,
      titulo: `${num(unclassified)} sin fórmula asignada`,
      detalle: `de ${num(pieces.length)} piezas`,
    },
  ].filter(Boolean) as { href: string; titulo: string; detalle: string }[];

  return (
    <>
      <PageHeader title="Overview" subtitle={`${source.label} · ${num(pieces.length)} piezas`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat k="Piezas" v={num(pieces.length)} sub={`${num(publicadas.length)} publicadas`} />
        <Stat
          k="Medidas"
          v={num(medidas.length)}
          sub={`${Math.round((medidas.length / Math.max(pieces.length, 1)) * 100)}% del total`}
        />
        <Stat k="Sin medir" v={num(deuda.length)} sub="publicadas" />
        <Stat k="Alcance Σ" v={num(sumLatest(medidas, "impressions") + sumLatest(medidas, "views"))} />
        <Stat k="Follows Σ" v={num(sumLatest(medidas, "follows"))} good />
        <Stat k="Guardados Σ" v={num(sumLatest(medidas, "bookmarks"))} />
      </div>

      {atencion.length > 0 && (
        <>
          <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Requiere atención
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border">
              {atencion.map((a) => (
                <Link
                  key={a.titulo}
                  href={a.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{a.titulo}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{a.detalle}</div>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Distribución
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por canal</h3>
            <BarList items={topN(countBy(pieces, "channel"), 6)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por estado</h3>
            <BarList items={topN(countBy(pieces, "status"), 6)} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function topN(rec: Record<string, number>, n: number): { label: string; value: number }[] {
  const sorted = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, n).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(n).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) head.push({ label: "otros", value: rest });
  return head;
}
