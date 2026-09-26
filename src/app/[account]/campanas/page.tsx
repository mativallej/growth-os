import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { findSource } from "@/lib/sources";
import { adCoverage, adUniverse, loadAdsBySource } from "@/lib/ads";
import { num } from "@/lib/metrics";

export default async function CampanasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const { creatives, excluidos } = loadAdsBySource([source]);
  const universo = adUniverse([source]).personas;
  const cov = adCoverage(creatives, universo);

  if (universo.length === 0 && creatives.length === 0) {
    return (
      <>
        <PageHeader title="Campañas" subtitle={source.label} />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">Esta marca no declara creativos de campaña.</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Las raíces de ads se declaran en <code>config/sources.json</code>, en{" "}
              <code>notion.ads</code> de la marca.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // La matriz se arma por persona × ángulo: persona × dolor × ángulo da 72
  // celdas con 62 en cero, y una grilla casi vacía se lee como un error de la
  // app en vez de como el hueco que es.
  const porPersonaAngulo = new Map<string, number>();
  const porPersona = new Map<string, number>();
  for (const c of creatives) {
    if (!c.persona) continue;
    porPersona.set(c.persona, (porPersona.get(c.persona) ?? 0) + 1);
    if (c.angulo) {
      const k = `${c.persona}\u0000${c.angulo}`;
      porPersonaAngulo.set(k, (porPersonaAngulo.get(k) ?? 0) + 1);
    }
  }
  const sinCreativos = cov.personas.filter((p) => !porPersona.get(p));
  const doloresDe = (persona: string) =>
    universo.find((u) => u.persona === persona)?.dolores ?? [];
  const doloresCubiertos = (persona: string) =>
    new Set(creatives.filter((c) => c.persona === persona && c.dolor).map((c) => c.dolor!));

  return (
    <>
      <PageHeader
        title="Campañas"
        subtitle={`${source.label} · ${num(creatives.length)} creativos · persona × dolor × ángulo`}
      />

      {/* El aviso va primero y es parte del dato, no una nota al pie: sin esto
          alguien lee la matriz como rendimiento y no lo es. */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <p className="text-[13px] leading-relaxed">
            <strong>Esto es cobertura, no rendimiento.</strong> Ningún creativo tiene
            números cargados todavía: son briefs. Un creativo no se mide con las métricas
            del orgánico —pesan hook-rate, CTR y costo por resultado, no saves ni
            shares— y esas son derivadas que el contrato no escribe, porque{" "}
            <em>quién decide qué es caro o barato es una persona, no una fórmula</em>.
          </p>
        </CardContent>
      </Card>

      {sinCreativos.length > 0 && (
        <Card className="mb-5">
          <CardContent className="p-4">
            <div className="text-sm">
              <strong className="tabular-nums">{sinCreativos.length}</strong> de{" "}
              {cov.personas.length} buyer personas <strong>sin un solo creativo</strong>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sinCreativos.map((p) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Una persona sin creativos no tiene fila en ningún tablero de campañas:
              solo aparece cruzando el framework contra lo producido.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Cobertura por persona × ángulo
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[30rem] text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground/70">
              <th className="px-3 py-2 text-left font-normal">persona</th>
              {cov.angulos.map((a) => (
                <th key={a} className="px-2 py-2 text-center font-normal">{a}</th>
              ))}
              <th className="px-3 py-2 text-right font-normal">dolores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cov.personas.map((persona) => {
              const dolores = doloresDe(persona);
              const cubiertos = doloresCubiertos(persona);
              return (
                <tr key={persona}>
                  <td className="whitespace-nowrap px-3 py-2">
                    {persona}
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      {universo.find((u) => u.persona === persona)?.publico}
                    </span>
                  </td>
                  {cov.angulos.map((a) => {
                    const n = porPersonaAngulo.get(`${persona}\u0000${a}`) ?? 0;
                    return (
                      <td key={a} className="px-2 py-2 text-center tabular-nums">
                        {/* El cero se dibuja como raya: no es "cero medido", es
                            "no se produjo". */}
                        {n > 0 ? (
                          <span className="inline-flex min-w-6 justify-center rounded bg-primary/10 px-1.5 py-0.5 font-medium">
                            {n}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/25">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-muted-foreground">
                    {dolores.length === 0
                      ? "sin dolores declarados"
                      : `${cubiertos.size}/${dolores.length}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground/70">
        <p>
          {num(cov.celdas.filter((c) => c.count === 0).length)} de{" "}
          {num(cov.celdas.length)} combinaciones persona × dolor × ángulo sin un creativo.
        </p>
        {Object.keys(cov.derivadas).length > 0 && (
          <p>
            Dimensiones deducidas de la ubicación en vez de declaradas:{" "}
            {Object.entries(cov.derivadas)
              .map(([d, n]) => `${d} (${n})`)
              .join(" · ")}
            . Una deducida se rompe si el archivo se mueve.
          </p>
        )}
        <p>
          {num(excluidos.length)} archivos excluidos a propósito:{" "}
          {[...new Set(excluidos.map((e) => e.motivo))].join(" · ")}.
        </p>
      </div>
    </>
  );
}
