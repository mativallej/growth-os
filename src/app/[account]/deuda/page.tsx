import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import DeudaClient, { type FilaCreativo, type FilaDeuda } from "@/components/DeudaClient";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { analyticsDebt } from "@/lib/rollups";
import { loadCreatives } from "@/lib/ads";

export default async function DeudaPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);

  const piezas: FilaDeuda[] = analyticsDebt(pieces).map(({ piece, days, sinEnlace }) => ({
    slug: piece.slug,
    title: piece.title,
    href: `/${account}/piezas/${piece.slug}`,
    canal: piece.channel,
    dias: days,
    cobertura: piece.coverage,
    sinEnlace,
  }));

  // Los creativos tienen su propia deuda y NO se suma con la de arriba: una
  // pieza en deuda se publicó y nadie la midió, un creativo todavía no corrió en
  // una ronda con números. Son dos tablas, no un total.
  const creativos: FilaCreativo[] = loadCreatives([source]).map((c) => ({
    slug: c.slug,
    title: c.title,
    relPath: c.relPath,
    persona: c.persona ?? "",
    angulo: c.angulo ?? "",
    ronda: c.ronda ?? "",
    estado: c.estado ?? "",
  }));

  return (
    <>
      <PageHeader title="Deuda de medición" />
      <DeudaClient piezas={piezas} creativos={creativos} totalPiezas={pieces.length} />
    </>
  );
}
