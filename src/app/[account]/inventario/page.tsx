import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InventarioClient from "@/components/InventarioClient";
import { loadPieces } from "@/lib/parse";
import { loadCreatives } from "@/lib/ads";
import { findSource } from "@/lib/sources";
import { loadFormulas } from "@/lib/formulas";
import { dePieza, deCreativo } from "@/lib/unidades-server";
import { cargarUmbrales } from "@/lib/viralidad-server";

export default async function InventarioPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const catalogo = loadFormulas().formulas;
  // Los umbrales de viralidad son DECLARADOS (config/viralidad.json): 'viral'
  // significa algo distinto en cada red, y una fórmula que lo derive sola
  // inventaría el criterio.
  const umbrales = cargarUmbrales();

  // TODO el orgánico, también lo que no tiene footer ni métricas: una pieza sin
  // medir es deuda visible, y esconderla es lo que hacía invisible el agujero.
  const rows = loadPieces([source])
    .sort((a, b) => a.relPath.localeCompare(b.relPath))
    .map((p) => dePieza(p, account, catalogo, umbrales));

  // Los creativos van por separado, NO mezclados: un creativo no tiene fórmula
  // y no se mide con las métricas del orgánico. El toggle cambia el conjunto.
  const creativos = loadCreatives([source]).map((c) => deCreativo(c, account));
  const conNumeros = rows.filter((r) => r.alcance !== null).length;

  return (
    <>
      <PageHeader
        title="Inventario"
        subtitle={
          `${source.label} · ${rows.length} piezas · ${conNumeros} con alcance medido` +
          (creativos.length ? ` · ${creativos.length} creativos` : "")
        }
      />
      <InventarioClient
        rows={rows}
        creativos={creativos}
        account={account}
        umbrales={umbrales}
      />
    </>
  );
}
