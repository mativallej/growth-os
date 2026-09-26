import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import { CAPAS, DUENOS, marcasDelMapa, operacionesDelMapa } from "@/lib/mapa";
import { destinosDe } from "@/lib/destinos";
import { findSource as buscarFuente } from "@/lib/sources";

const FORMA: Record<string, string> = {
  captura: "Captura — se guarda al instante, sin red",
  sesion: "Sesión local — la app prepara, una persona ejecuta",
  export: "Exportación — devuelve un archivo",
};

export default async function MapaPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const fuente = buscarFuente(account);
  if (!fuente) notFound();

  // Solo los destinos CON dirección configurada: un acceso a un destino sin
  // configurar es un enlace muerto, y eso es peor que no tener el acceso.
  const accesos = destinosDe(fuente.brand);

  const marcas = marcasDelMapa();
  const operaciones = operacionesDelMapa();

  return (
    <>
      <PageHeader
        title="Mapa del sistema"
        subtitle="Qué se hace en cada capa, y qué no le corresponde a ninguna otra."
      />

      <p className="mb-7 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Tres capas y <strong>un verbo cada una</strong>. Si dos comparten verbo, una de
        las dos está de más. La frontera que más se pone a prueba es la primera: esta
        plataforma no es un editor, y la única escritura de contenido que admite es
        captar una idea — que es materia prima, no trabajo creativo.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {CAPAS.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex h-full flex-col p-5">
              <div className="flex items-baseline gap-2">
                <Badge>{c.verbo}</Badge>
              </div>
              <h2 className="mt-2 text-sm font-medium">{c.nombre}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.quees}</p>

              <ul className="mt-4 space-y-1.5 text-[13px]">
                {c.hace.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span aria-hidden="true" className="text-muted-foreground/50">·</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              {/* La mitad que más se olvida: qué NO le toca. Un mapa que solo
                  dice qué hace cada capa no evita resolver en la equivocada. */}
              <div className="mt-auto pt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                  Lo que no le corresponde
                </div>
                <ul className="mt-1.5 space-y-1.5 text-[13px] text-muted-foreground">
                  {c.noHace.map((n) => (
                    <li key={n} className="flex gap-2">
                      <span aria-hidden="true" className="text-muted-foreground/40">×</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accesos.length > 0 && (
        <>
          <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Abrir el destino de coordinación
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {accesos.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border px-4 py-3 transition-colors hover:bg-secondary"
              >
                <div className="flex items-center justify-between gap-2 text-[13px] font-medium">
                  {d.nombre}
                  <span aria-hidden="true" className="text-muted-foreground">↗</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {d.descripcion}
                </p>
              </a>
            ))}
          </div>
        </>
      )}

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Quién manda sobre cada campo
      </div>
      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
        Nunca escriben los dos lados lo mismo. Esta tabla vive en un solo lugar del
        código a propósito: tenerla dos veces garantiza que un día se separen, y ese
        día nadie va a saber cuál es la buena.
      </p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[34rem] text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground/70">
              <th className="px-3 py-2 text-left font-normal">campo</th>
              <th className="px-3 py-2 text-left font-normal">manda</th>
              <th className="px-3 py-2 text-left font-normal">si se toca del otro lado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DUENOS.map((d) => (
              <tr key={d.campo}>
                <td className="px-3 py-2">{d.campo}</td>
                <td className="px-3 py-2">
                  <Badge variant={d.dueno === "vault" ? "default" : "secondary"}>{d.dueno}</Badge>
                </td>
                <td className="px-3 py-2 leading-relaxed text-muted-foreground">
                  {d.siSeTocaDelOtroLado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Las marcas de este build
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {marcas.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-5">
              <h3 className="text-sm font-medium">{m.label}</h3>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">vault</dt>
                  <dd className="min-w-0 break-all font-mono text-[11px]">{m.vault}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">contenido</dt>
                  <dd className="min-w-0 break-all font-mono text-[11px]">{m.raices.join(" · ")}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">campañas</dt>
                  <dd className="min-w-0 break-all font-mono text-[11px]">
                    {m.campanas.length ? m.campanas.join(" · ") : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Sale del registro de fuentes. Agregar una marca la hace aparecer acá sin tocar
        esta vista — un mapa escrito a mano es lo primero que queda viejo, y un mapa
        viejo manda a la capa equivocada con confianza.
      </p>

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Las operaciones declaradas
      </div>
      <div className="mt-3 space-y-4">
        {operaciones.map((g) => (
          <Card key={g.forma}>
            <CardContent className="p-5">
              <h3 className="text-xs font-medium text-muted-foreground">
                {FORMA[g.forma] ?? g.forma}
              </h3>
              <ul className="mt-3 space-y-2">
                {g.operaciones.map((o) => (
                  <li key={o.id} className="text-[13px]">
                    <span className="font-medium">{o.nombre}</span>
                    {o.marcas && (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        solo {o.marcas}
                      </span>
                    )}
                    <span className="block text-muted-foreground">{o.descripcion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-2 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
        Ninguna corre sola. La app prepara el contexto, una persona la dispara desde la
        consola local y ve el resultado en el momento. Si nadie la dispara, no pasa
        nada — y por eso la antigüedad de cada operación está a la vista.
      </p>
    </>
  );
}
