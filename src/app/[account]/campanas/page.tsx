import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import CampanasClient, {
  type CreativoRow,
  type PersonaFila,
} from "@/components/CampanasClient";
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
  // app en vez de como el hueco que es. El dolor no se pierde — es una columna
  // del detalle, que ahora existe.
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

  const filas: PersonaFila[] = cov.personas.map((persona) => {
    const dolores = universo.find((u) => u.persona === persona)?.dolores ?? [];
    const cubiertos = new Set(
      creatives.filter((c) => c.persona === persona && c.dolor).map((c) => c.dolor!),
    );
    return {
      persona,
      publico: universo.find((u) => u.persona === persona)?.publico,
      dolores: dolores.length,
      cubiertos: cubiertos.size,
      porAngulo: Object.fromEntries(
        cov.angulos.map((a) => [a, porPersonaAngulo.get(`${persona}\u0000${a}`) ?? 0]),
      ),
      total: porPersona.get(persona) ?? 0,
    };
  });

  // Solo los campos que la tabla muestra. Un `Creative` entero lleva `path`
  // absoluto, y eso es la ruta del disco de alguien: no tiene por qué viajar al
  // navegador.
  const creativos: CreativoRow[] = creatives
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      relPath: c.relPath,
      persona: c.persona,
      publico: c.publico,
      dolor: c.dolor,
      formato: c.formato,
      angulo: c.angulo,
      anguloRaw: c.anguloRaw,
      ronda: c.ronda,
      estado: c.estado,
      derivadas: c.derivadas,
    }))
    .sort(
      (a, b) =>
        (a.persona ?? "").localeCompare(b.persona ?? "") ||
        (a.ronda ?? "").localeCompare(b.ronda ?? "") ||
        a.title.localeCompare(b.title),
    );

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

      <CampanasClient filas={filas} angulos={cov.angulos} creativos={creativos} />

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
