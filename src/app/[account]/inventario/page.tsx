import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InventarioClient, { type InventarioRow } from "@/components/InventarioClient";
import type { Opcion } from "@/components/Filtros";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { formulaCodeOf, loadFormulas } from "@/lib/formulas";

const conteo = (vals: string[]): Opcion[] => {
  const m = new Map<string, number>();
  for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
};

export default async function InventarioPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;
  // TODO lo que hay, también lo que no tiene footer ni métricas: una pieza sin
  // medir es deuda visible, y esconderla es lo que hacía invisible el agujero.
  const pieces = loadPieces([source]).sort((a, b) => a.relPath.localeCompare(b.relPath));

  const rows: InventarioRow[] = pieces.map((p) => ({
    title: p.title,
    href: `/${account}/piezas/${p.slug}`,
    canal: p.channel,
    formula: p.formula ?? "",
    formulaCode: formulaCodeOf(p, catalogo) ?? "",
    estado: p.estado ?? "",
    status: p.status,
    coverage: p.coverage,
    publishedAt: p.publishedAt ?? "",
    cortes: p.snapshots.length,
    search: `${p.title} ${p.canal ?? ""} ${p.formula ?? ""} ${p.estado ?? ""}`.toLowerCase(),
  }));

  return (
    <>
      <PageHeader title="Inventario" subtitle={`${source.label} · ${pieces.length} piezas`} />
      <InventarioClient
        rows={rows}
        canales={conteo(rows.map((r) => r.canal))}
        formulas={conteo(rows.map((r) => r.formulaCode))}
      />
    </>
  );
}
