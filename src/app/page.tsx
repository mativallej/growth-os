import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { listSources } from "@/lib/sources";
import { loadPieces } from "@/lib/parse";
import { num } from "@/lib/metrics";
import Logo from "@/components/Logo";
import Saludo from "@/components/Saludo";
import { accesosDe, type Acceso } from "@/lib/accesos";

/**
 * LA RAÍZ. Saluda, y muestra la marca que tiene este build.
 *
 * Antes `/` era un redirect en `next.config.ts` a la primera marca. Eso tenía dos
 * problemas: "la primera" es una elección que la config no toma en ningún otro
 * lado, y `output: 'export'` no soporta `redirects()`, así que en un build
 * estático desaparecía sin avisar y `/` quedaba en 404.
 *
 * Y NO ENUMERA. Un deploy es de UNA marca —es la frontera de privacidad del
 * proyecto— así que "2 marcas en este build" describía una forma que este repo ya
 * no tiene. Lo que queda es el dato que sí importa: cuál es, y cuánto tiene.
 *
 * Sigue siendo una lista y no una sola tarjeta hardcodeada, porque `listSources`
 * puede devolver más de una si alguien buildea sin `GROWTH_SOURCES`. En ese caso
 * el encabezado lo dice, en vez de mostrar la primera y esconder el resto.
 */
const GRUPOS: Acceso["grupo"][] = ["Coordinación", "Cuentas", "Archivos"];

export default function Home() {
  const sources = listSources();
  const piezas = loadPieces(sources);
  const una = sources.length === 1;

  // Los accesos directos de cada marca. Salen de lo que ya estaba declarado: las
  // cuentas de config/sources.json con el patrón de su red, los tableros de
  // config/destinos.json, y el bloque `enlaces` para lo que no es ninguna de las
  // dos cosas. Un acceso sin url NO se dibuja — un link muerto promete y falla.
  const accesos = sources.map((s) => ({ source: s, ...accesosDe(s.id) }));

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <Logo />

      <div className="mt-8">
        <Saludo />
      </div>

      <div className="mt-9 w-full">
        {/* Sin rótulo cuando hay una sola marca: "Tu marca" arriba de una única
            tarjeta que ya dice su nombre no agrega nada. Con más de una sí, que
            ahí el número es el dato. */}
        {!una && (
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {sources.length} marcas en este build
          </div>
        )}

        <div className="space-y-2">
          {sources.map((s) => {
            const n = piezas.filter((p) => p.source === s.id).length;
            const medidas = piezas.filter(
              (p) => p.source === s.id && p.coverage === "tracked",
            ).length;
            return (
              <Link key={s.id} href={`/${s.id}`} className="block">
                <Card className="transition-colors hover:border-foreground/25">
                  <CardContent className="flex items-center justify-between gap-4 p-4 text-left">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {/* Las dos cifras juntas porque la segunda es el hallazgo:
                            la brecha entre publicar y medir es la deuda del sistema. */}
                        {num(n)} piezas · {num(medidas)} medidas
                      </div>
                    </div>
                    <span aria-hidden="true" className="shrink-0 text-muted-foreground">→</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {accesos.some((a) => a.lista.length > 0 || a.sinDeclarar.length > 0) && (
        <div className="mt-8 w-full text-left">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Accesos directos
          </div>

          {accesos.map(({ source, lista, sinDeclarar }) => (
            <div key={source.id} className="mb-4 last:mb-0">
              {!una && (
                <div className="mb-1.5 text-[11px] text-muted-foreground">{source.label}</div>
              )}

              {GRUPOS.map((grupo) => {
                const del = lista.filter((a) => a.grupo === grupo);
                if (del.length === 0) return null;
                return (
                  <div key={grupo} className="mb-2 last:mb-0">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/50">
                      {grupo}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {del.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          title={a.detalle}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-foreground/25 hover:bg-muted"
                        >
                          <span>{a.label}</span>
                          {a.detalle?.startsWith("@") && (
                            <span className="text-muted-foreground/70">{a.detalle}</span>
                          )}
                          <span aria-hidden="true" className="text-muted-foreground/40">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Los declarados SIN url se DICEN en vez de desaparecer: así se
                  sabe que el acceso existe y que falta completarlo, en vez de
                  pensar que nadie lo configuró nunca. */}
              {sinDeclarar.length > 0 && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/60">
                  Sin dirección declarada: {sinDeclarar.join(" · ")} — se completan en{" "}
                  <code>config/destinos.json</code> y <code>config/sources.json</code>.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Al final y no arriba: quien entra viene a mirar su marca, no a leer
          para qué existe esto. La cita cierra, no recibe. */}
      <blockquote className="mt-12 max-w-[44ch] border-l-2 border-border pl-4 text-left">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Lo que ninguna otra herramienta puede responder: qué fórmula nunca se
          estrenó, qué se publicó y nunca se midió, si la cadencia se sostiene.
        </p>
        <footer className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
          — Matias Vallejos
          <span className="block text-muted-foreground/60">Entrepreneur</span>
        </footer>
      </blockquote>

    </main>
  );
}
