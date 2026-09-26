import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { cadenceByMonth } from "@/lib/rollups";
import { num } from "@/lib/metrics";

// La dieta: el piso y el techo de piezas por mes. Son los números del proyecto,
// no una estimación de esta app.
const PISO = 10;
const TECHO = 14;

export default async function CadenciaPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const { months, undated, total } = cadenceByMonth(loadPieces([source]));
  const max = Math.max(TECHO, ...months.map((m) => m.count));

  return (
    <>
      <PageHeader
        title="Cadencia"
        subtitle={`${source.label} · piezas publicadas por mes contra la dieta de ${PISO}-${TECHO}`}
      />

      {/* Las piezas sin fecha van ARRIBA, no en una nota al pie. Para Tegu son
          casi la mitad de las publicadas, y repartirlas entre los meses daría
          una cadencia inventada: el agujero es el hallazgo. */}
      {undated > 0 && (
        <Card className="mb-5 border-[var(--tg-amber,theme(colors.amber.500))]">
          <CardContent className="p-4">
            <div className="text-sm">
              <strong className="tabular-nums">{num(undated)}</strong> de {num(total)} piezas publicadas{" "}
              <strong>no declaran fecha</strong>, así que no están en ningún mes de abajo.
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              No se reparten ni se estiman. La cadencia de abajo es la de las{" "}
              {num(total - undated)} que sí la declaran — leerla como la cadencia real
              sería leer una fracción como si fuera el total.
            </p>
          </CardContent>
        </Card>
      )}

      {months.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">Ninguna pieza publicada declara fecha.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              No es que no se publicó: es que no se puede saber cuándo. La fecha va
              en el campo <code>date</code> del footer, o adentro del estado
              (<code>estado: Publicado 2026-07-08</code>).
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="space-y-2">
              {months.map((m) => {
                const bajo = m.count < PISO;
                return (
                  <div key={m.month} className="flex items-center gap-3 text-[13px]">
                    <span className="w-16 shrink-0 font-mono text-muted-foreground">{m.month}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-secondary">
                      {/* La banda del objetivo, para que el mes se lea contra
                          ella y no contra el mes más alto. */}
                      <div
                        className="absolute inset-y-0 border-x border-dashed border-muted-foreground/40 bg-muted-foreground/5"
                        style={{ left: `${(PISO / max) * 100}%`, width: `${((TECHO - PISO) / max) * 100}%` }}
                        aria-hidden="true"
                      />
                      <div
                        className={`h-full rounded-r ${bajo ? "bg-muted-foreground/50" : "bg-primary"}`}
                        style={{ width: `${(m.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                      {m.count}
                      {bajo && <span className="ml-1 text-[11px]">−{PISO - m.count}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground/70">
              La banda punteada es el objetivo de {PISO}-{TECHO}. El número chico es lo
              que faltó para el piso.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
