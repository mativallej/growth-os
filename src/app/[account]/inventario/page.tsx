import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InventarioClient from "@/components/InventarioClient";
import { loadPieces } from "@/lib/parse";
import { loadCreatives } from "@/lib/ads";
import { findSource } from "@/lib/sources";
import { loadFormulas } from "@/lib/formulas";
import { dePieza, deCreativo } from "@/lib/unidades-server";

export default async function InventarioPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;

  // TODO el orgánico, también lo que no tiene footer ni métricas: una pieza sin
  // medir es deuda visible, y esconderla es lo que hacía invisible el agujero.
  const rows = loadPieces([source])
    .sort((a, b) => a.relPath.localeCompare(b.relPath))
    .map((p) => dePieza(p, account, catalogo));

  // Los creativos van por separado, NO mezclados: un creativo no tiene fórmula
  // y no se mide con las métricas del orgánico. El toggle cambia el conjunto.
  const creativos = loadCreatives([source]).map((c) => deCreativo(c, account));

  return (
    <>
      <PageHeader
        title="Inventario"
        subtitle={`${source.label} · ${rows.length} piezas${creativos.length ? ` · ${creativos.length} creativos` : ""}`}
      />
      <InventarioClient rows={rows} creativos={creativos} />
    </>
  );
}
