import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { findSource } from "@/lib/sources";
import { porFase, skillsDe } from "@/lib/metodologia";

const DONDE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  vault: { label: "en el vault", variant: "default" },
  plataforma: { label: "en esta app", variant: "secondary" },
  "la red": { label: "en la red", variant: "outline" },
  "coordinación": { label: "en el tablero", variant: "outline" },
};

export default async function MetodoPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const skills = skillsDe(source.brand);
  const { fases, sinFase } = porFase(skills);

  return (
    <>
      <PageHeader
        title="El método"
        subtitle={`${source.label} · los ocho pasos, qué skill hace cada uno, y qué se rompe si se saltea`}
      />

      <p className="mb-7 max-w-[72ch] text-[13px] leading-relaxed text-muted-foreground">
        El loop completo, de una idea suelta a un aprendizaje escrito. <strong>La app
        entra en dos pasos y en ningún otro</strong>: captar la idea y medir. Todo lo
        demás es el vault con sus skills — y esa frontera es lo que evita que esto
        termine siendo un editor peor que el que ya hay.
      </p>

      <ol className="space-y-3">
        {fases.map((f, i) => {
          const d = DONDE[f.donde] ?? DONDE.vault;
          return (
            <li key={f.id}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[11px] tabular-nums text-muted-foreground/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-sm font-medium">{f.nombre}</h2>
                    <Badge variant={d.variant}>{d.label}</Badge>
                  </div>

                  <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed">{f.que}</p>

                  <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                        Skills ({f.skills.length})
                      </div>
                      {f.skills.length === 0 ? (
                        // Una fase sin skills en ESTE vault no es un error: puede
                        // vivir en la app, en otro vault, o directamente faltar.
                        // Las tres cosas vale la pena verlas.
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          Ninguna en este vault.{" "}
                          {f.donde === "plataforma"
                            ? "Lo cubre esta app."
                            : f.donde === "la red"
                              ? "Se hace a mano, fuera del sistema."
                              : "O vive en otro vault, o es un hueco del método."}
                        </p>
                      ) : (
                        <ul className="mt-1.5 space-y-1.5">
                          {f.skills.map((s) => (
                            <li key={s.nombre} className="text-[13px] leading-snug">
                              <code className="font-medium">/{s.nombre}</code>
                              {s.descripcion && (
                                <span className="block text-[11px] leading-relaxed text-muted-foreground">
                                  {s.descripcion.slice(0, 160)}
                                  {s.descripcion.length > 160 ? "…" : ""}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                          Qué hace esta app
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {f.plataforma ?? "Nada. No le toca."}
                        </p>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                          Si se saltea
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {f.siSeSaltea}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      {sinFase.length > 0 && (
        <>
          <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Fuera del loop de contenido
          </div>
          <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
            {sinFase.length} skills del vault que no caen en ninguna fase. No están
            escondidas a propósito: o hacen algo que el método no contempla, o falta una
            fase. Las dos cosas vale la pena verlas.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sinFase.map((s) => (
              <Badge key={s.nombre} variant="outline" title={s.descripcion}>
                <code>/{s.nombre}</code>
              </Badge>
            ))}
          </div>
        </>
      )}

      <p className="mt-9 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
        Las fases están escritas —son la doctrina, no se derivan de nada— y las skills se
        leen de <code>.claude/skills/</code> del vault de esta marca. Agregar una skill la
        hace aparecer acá sin tocar esta vista, y las del otro vault no se leen: es la
        misma frontera que el resto de la app.
      </p>
    </>
  );
}
