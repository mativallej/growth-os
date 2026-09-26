import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { analyticsDebt } from "@/lib/rollups";
import { num } from "@/lib/metrics";

export default async function DeudaPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);
  const filas = analyticsDebt(pieces);
  const sinEnlace = filas.filter((f) => f.sinEnlace).length;
  const masVieja = filas.find((f) => f.days !== null)?.days ?? null;

  return (
    <>
      <PageHeader
        title="Deuda de medición"
        subtitle={`${source.label} · piezas publicadas sin números, de la más vieja a la más nueva`}
      />

      {filas.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">Ninguna pieza publicada quedó sin medir.</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              De {num(pieces.length)} piezas, las publicadas tienen todas al menos un corte.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { k: "Sin medir", v: num(filas.length) },
              { k: "La más vieja", v: masVieja !== null ? `${num(masVieja)} días` : "—" },
              { k: "Sin enlace", v: num(sinEnlace) },
            ].map((t) => (
              <Card key={t.k}>
                <CardContent className="p-4">
                  <div className="text-[11px] text-muted-foreground">{t.k}</div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{t.v}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sinEnlace > 0 && (
            <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{num(sinEnlace)}</strong> de estas no
              tienen <code>url</code> en el footer, así que <strong>no se pueden medir</strong>:
              la url es la llave con la que el ingest empareja la pieza con su fila del
              export. Esa es otra deuda, y se arregla antes que la de los números.
            </p>
          )}

          <Card>
            <CardContent className="divide-y divide-border p-0">
              {filas.map(({ piece, days, sinEnlace: sl }) => (
                <div key={piece.slug} className="flex items-baseline gap-3 px-4 py-2.5 text-[13px]">
                  <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                    {/* Una pieza sin fecha NO dice "hace 0 días": no se sabe hace
                        cuánto está así, y un 0 la pondría primera en una lista
                        que se lee de arriba para abajo. */}
                    {days !== null ? `${days} días` : "sin fecha"}
                  </span>
                  <Link href={`/${account}/piezas/${piece.slug}`} className="flex-1 truncate hover:underline">
                    {piece.title}
                  </Link>
                  <span className="hidden shrink-0 text-muted-foreground sm:inline">{piece.channel}</span>
                  {piece.coverage === "pending" && <Badge variant="secondary">pendiente</Badge>}
                  {sl && <Badge variant="outline">sin enlace</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/70">
            <strong>pendiente</strong> = el footer declara que se va a medir y todavía no
            se midió. Sin ese marcador, la pieza directamente no tiene footer de métricas.
            Las dos son deuda; la primera es deuda reconocida.
          </p>
        </>
      )}
    </>
  );
}
