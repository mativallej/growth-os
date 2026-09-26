import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InventarioClient, { type InventarioRow } from "@/components/InventarioClient";
import { loadPieces } from "@/lib/parse";
import { countBy } from "@/lib/metrics";
import { findSource } from "@/lib/sources";

export default async function InventarioPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  // El inventario incluye TODO, también lo que no tiene footer ni métricas:
  // una pieza sin medir es deuda visible, y esconderla es lo que hacía que el
  // agujero real —el canal casi vacío— no se viera.
  const pieces = loadPieces([source]).sort((a, b) => a.relPath.localeCompare(b.relPath));

  const nets = Object.entries(countBy(pieces, "channel"))
    .filter(([c, n]) => c !== "unknown" && c !== "—" && n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const rows: InventarioRow[] = pieces.map((p) => ({
    title: p.title,
    href: `/${account}/piezas/${p.slug}`,
    canal: p.channel,
    formula: p.formula ?? "",
    estado: p.estado ?? "",
    coverage: p.coverage,
    snaps: p.snapshots.length,
    search: `${p.title} ${p.canal ?? ""} ${p.formula ?? ""} ${p.estado ?? ""}`.toLowerCase(),
  }));

  return (
    <>
      <PageHeader title="Inventario" subtitle={`${source.label} · ${pieces.length} piezas`} />
      <InventarioClient rows={rows} nets={nets} />
    </>
  );
}
