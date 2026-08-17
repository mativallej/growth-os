import PageHeader from "@/components/PageHeader";
import InventarioClient, { type InventarioRow } from "@/components/InventarioClient";
import { loadPieces } from "@/lib/parse";
import { countBy } from "@/lib/metrics";

export default function InventarioPage() {
  const pieces = loadPieces().sort((a, b) => a.relPath.localeCompare(b.relPath));

  const nets = Object.entries(countBy(pieces, "canal"))
    .filter(([c, n]) => c !== "—" && n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const rows: InventarioRow[] = pieces.map((p) => ({
    title: p.title,
    slug: p.slug,
    canal: p.canal ?? "",
    formula: p.formula ?? "",
    estado: p.estado ?? "",
    snaps: p.snapshots.length,
    search: `${p.title} ${p.canal ?? ""} ${p.formula ?? ""} ${p.estado ?? ""}`.toLowerCase(),
  }));

  return (
    <>
      <PageHeader title="Inventario" subtitle={`${pieces.length} piezas en Brand/Content`} />
      <InventarioClient rows={rows} nets={nets} />
    </>
  );
}
