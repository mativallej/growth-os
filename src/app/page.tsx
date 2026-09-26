import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { listSources } from "@/lib/sources";
import { loadPieces } from "@/lib/parse";
import { num } from "@/lib/metrics";
import Logo from "@/components/Logo";

/**
 * LA RAÍZ. Lista las marcas que ENTRARON A ESTE BUILD, y nada más.
 *
 * Antes `/` era un redirect en `next.config.ts` a la primera marca. Eso tenía dos
 * problemas que se juntaron:
 *
 *  1. Con n vaults, "la primera" es una elección arbitraria que la config no toma
 *     en ningún otro lado.
 *  2. `output: 'export'` NO SOPORTA `redirects()` (está en la lista de features no
 *     soportadas de los docs de Next 16.3). En un build estático ese redirect
 *     desaparece sin avisar y `/` queda en 404.
 *
 * Una página de verdad arregla las dos, y además dice algo que el redirect
 * escondía: qué marcas contiene este deploy. En un build para externos
 * (`GROWTH_SOURCES=tegu`) esta lista tiene UNA entrada, y eso es la prueba visible
 * de que el recorte funcionó — la otra marca no está porque no se compiló.
 */
export default function Home() {
  const sources = listSources();
  const piezas = loadPieces(sources);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-10">
        <Logo />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Lo que ninguna otra herramienta puede responder: qué fórmula nunca se
          estrenó, qué se publicó y nunca se midió, si la cadencia se sostiene.
          La verdad son los <code>.md</code> de cada vault — esto los lee, no los
          escribe.
        </p>
      </div>

      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {sources.length === 1 ? "Marca en este build" : `${sources.length} marcas en este build`}
      </div>

      <div className="space-y-2">
        {sources.map((s) => {
          const n = piezas.filter((p) => p.source === s.id).length;
          return (
            <Link key={s.id} href={`/${s.id}`} className="block">
              <Card className="transition-colors hover:border-foreground/25">
                <CardContent className="flex items-baseline justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">/{s.id}</div>
                  </div>
                  <div className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">
                    {num(n)} piezas
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground/70">
        Las marcas que entran se recortan con <code>GROWTH_SOURCES</code> en el build.
        Una marca que no entró no tiene rutas emitidas: no está escondida, no existe
        en este deploy.
      </p>
    </main>
  );
}
