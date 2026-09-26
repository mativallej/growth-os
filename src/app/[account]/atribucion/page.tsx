import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { circuitoAbierto, clavesRepetidas, enlaceRastreable, senales } from "@/lib/attribution";
import { num } from "@/lib/metrics";

const SENALES = [
  { id: "clic", titulo: "Atribuida por clic", ve: "quién llegó por un enlace rastreado", ciega: "lo que se comparte por privado" },
  { id: "autoReportada", titulo: "Auto-reportada", ve: "el campo de «¿cómo nos conociste?»", ciega: "lo que la gente no recuerda" },
  { id: "serieTemporal", titulo: "Serie temporal", ve: "registros durante períodos de publicación", ciega: "cualquier otra causa del mismo mes" },
] as const;

export default async function AtribucionPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const piezas = loadPieces([source]);
  const publicadas = piezas.filter((p) => p.status === "published");
  const s = senales();
  const abierto = circuitoAbierto(s);
  const repetidas = clavesRepetidas(piezas);

  // Una pieza publicada que no puede llevar enlace rastreable es no atribuible,
  // y eso es una deuda DISTINTA de no tener métricas: se puede medir el alcance
  // de algo que no se puede atribuir.
  const noAtribuibles = publicadas.filter(
    (p) => !enlaceRastreable(p, "https://tegu.ar").atribuible,
  );
  const sinId = publicadas.filter((p) => !p.id).length;

  return (
    <>
      <PageHeader
        title="Atribución"
        subtitle={`${source.label} · de una pieza a lo que pasa después de la red`}
      />

      {abierto && (
        // Esto va primero y en grande: sin él, los ceros de abajo se leerían
        // como "no convirtió nada", que es la clase de número que hace cancelar
        // un canal que funcionaba.
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--tg-red)]" />
              <h2 className="text-sm font-medium">El circuito está abierto</h2>
            </div>
            <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
              Ninguna de las tres señales está midiendo todavía. Esta vista{" "}
              <strong>no muestra ceros</strong> a propósito: &ldquo;no se está
              midiendo&rdquo; no es &ldquo;cero conversiones&rdquo;, y confundirlos es el
              error más caro que esta pantalla puede cometer.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Las tres señales
      </div>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Nunca se colapsan en un número y <strong>ninguna se presenta sola</strong>: una
        sola parece la verdad. Las discrepancias entre ellas son información — si el clic
        dice 3 y el auto-reportado dice 20, esas 17 personas llegaron por un camino que
        el clic no ve.
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {SENALES.map((def) => {
          const e = s[def.id];
          return (
            <Card key={def.id}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium">{def.titulo}</h3>
                  <Badge variant={e.disponible ? "success" : "outline"}>
                    {e.disponible ? "midiendo" : "sin medir"}
                  </Badge>
                </div>

                {e.disponible ? (
                  <div className="mt-3 text-2xl font-semibold tabular-nums">{num(e.valor)}</div>
                ) : (
                  // Sin número. Un "—" es honesto; un 0 sería una afirmación.
                  <div className="mt-3 text-2xl text-muted-foreground/40">—</div>
                )}

                <dl className="mt-3 space-y-1.5 text-[11px] leading-relaxed">
                  <div>
                    <dt className="inline text-muted-foreground">Ve: </dt>
                    <dd className="inline">{def.ve}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">No ve: </dt>
                    <dd className="inline">{def.ciega}</dd>
                  </div>
                </dl>

                {!e.disponible && (
                  <div className="mt-auto pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    <div>{e.motivo}</div>
                    <div className="mt-1.5 text-muted-foreground/70">
                      <strong>Falta:</strong> {e.falta}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Deuda de atribución
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          { k: "Publicadas", v: num(publicadas.length) },
          { k: "No atribuibles", v: num(noAtribuibles.length), sub: "no pueden llevar enlace" },
          { k: "Con llave frágil", v: num(sinId), sub: "sin id: la llave sale de la ruta" },
        ].map((t) => (
          <Card key={t.k}>
            <CardContent className="p-4">
              <div className="text-[11px] text-muted-foreground">{t.k}</div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{t.v}</div>
              {t.sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{t.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {sinId > 0 && (
        <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
          Un enlace rastreable <strong>ya publicado no se puede corregir</strong>: vive en
          un tweet de hace ocho meses. Si su llave sale de la ruta y la ruta cambia, el
          dato no se rompe — <strong>miente</strong>, y apunta a otra pieza. Por eso la
          llave es el <code>id</code> del footer, y hay {num(sinId)} piezas publicadas que
          todavía no lo tienen.
        </p>
      )}

      {repetidas.length > 0 && (
        <div className="mt-4 rounded-lg border border-border p-4">
          <p className="text-[13px]">
            <strong className="tabular-nums">{repetidas.length}</strong> llaves de
            atribución repetidas. Un registro con esa llave no se puede asignar a ninguna
            de las dos.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {repetidas.slice(0, 5).map((r) => (
              <li key={r.clave}>
                <code>{r.clave}</code> → {r.paths.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Lo que falta del otro lado
      </div>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        No es de este repo. Para que la señal de clic exista, el producto tiene que
        persistir el primer y el último toque <em>por separado</em> —son dos preguntas
        distintas, qué lo trajo y qué lo convenció— y emitirlos con el registro. Y el
        campo abierto de &ldquo;¿cómo nos conociste?&rdquo; es{" "}
        <strong>lo más barato de la lista y lo único que ve el boca a boca</strong>: el
        WhatsApp, que hoy es completamente invisible. La convención completa está en{" "}
        <code>docs/attribution.md</code>.
      </p>

      <p className="mt-4 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
        Este sistema no afirma causalidad, no fija umbrales y no define un objetivo de
        conversión. Junta la evidencia y la muestra separada; qué significa lo decide una
        persona. Ver también{" "}
        <Link href={`/${account}/deuda`} className="text-primary hover:underline">
          la deuda de medición
        </Link>
        , que es una deuda distinta: se puede medir el alcance de algo que no se puede
        atribuir.
      </p>
    </>
  );
}
