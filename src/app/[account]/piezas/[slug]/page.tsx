import { notFound } from "next/navigation";
import { esHttp, hostDe } from "@/lib/enlaces";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import PageHeader from "@/components/PageHeader";
import { loadPieces } from "@/lib/parse";
import { sortedSnaps, latest, engRate, pvRate, saveLike, primaryReach, num, pct } from "@/lib/metrics";
import { lineChart } from "@/lib/charts";
import { findSource } from "@/lib/sources";
import { compararVariantes, variantesDe } from "@/lib/variantes";
import { enlaceDePieza, leerCorrespondencia } from "@/lib/notion-links";
import { cargarUmbrales } from "@/lib/viralidad-server";
import { nivelDe } from "@/lib/viralidad";
import { accesosDe } from "@/lib/accesos";

/**
 * Anidado: Next ejecuta esto UNA VEZ POR CADA `account` que emitió el layout
 * padre, y le pasa ese param. Es lo que mantiene el aislamiento en el output:
 * las rutas de una marca se generan leyendo solo su fuente, así que un build
 * con `GROWTH_SOURCES=tegu` no emite un solo slug de la marca personal.
 */
/**
 * NADA FUERA DE LO GENERADO. Es la mitad estructural del aislamiento, y sin
 * esto el resto no alcanza.
 *
 * Por default Next renderiza bajo demanda un param que `generateStaticParams`
 * no devolvió. Con `GROWTH_SOURCES=tegu` eso significaba que `/personal/piezas`
 * daba 200 y servía el vault personal leído en el momento — el build no la
 * emitía, pero el servidor la fabricaba igual. Verificado el 2026-09-26 contra
 * `next start`: devolvía las sondas del contenido personal.
 *
 * En `false`, una marca que no entró al build es un 404.
 */
export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { account: string } }) {
  const source = findSource(params.account);
  if (!source) return [];
  return loadPieces([source]).map((p) => ({ slug: p.slug }));
}

/** Un acceso directo. Todos iguales: son destinos, no acciones de distinto peso. */
function Acceso({ href, label, title }: { href: string; label: string; title?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-foreground/25 hover:bg-muted"
    >
      {label}
      <span aria-hidden="true" className="text-muted-foreground/40">↗</span>
    </a>
  );
}

const verdictVariant = (v?: string): "success" | "destructive" | "secondary" => {
  const s = (v ?? "").toLowerCase();
  if (["breakout", "strong", "solid"].includes(s)) return "success";
  if (["weak", "flop"].includes(s)) return "destructive";
  return "secondary";
};

export default async function PiezaPage({
  params,
}: {
  params: Promise<{ account: string; slug: string }>;
}) {
  const { account, slug } = await params;
  const source = findSource(account);
  if (!source) notFound();
  const piezas = loadPieces([source]);
  const p = piezas.find((x) => x.slug === slug);
  if (!p) notFound();

  // Las variantes viven en la misma carpeta y comparten el número: `002`, `002b`,
  // `002c` son el MISMO post intentado de tres formas. Compararlas compara las
  // formas; comparar dos piezas distintas de una serie no diría nada.
  const variantes = compararVariantes(variantesDe(p, piezas));

  // El enlace a su fila del tablero. `null` NO significa que la pieza no esté
  // allá: significa que esta app no sabe cuál es su fila. Decir "no está
  // sincronizada" sería afirmar de más.
  const { correspondencia, dias: diasEnlaces } = leerCorrespondencia(source.brand);
  const enlaceTablero = enlaceDePieza(p, correspondencia);

  const snaps = sortedSnaps(p);
  const l = latest(p);
  // El eje es el ALCANCE, no impressions: en Instagram impressions no existe y
  // el gráfico salía plano en cero.
  const chart = snaps.length
    ? lineChart(snaps.map((s) => ({ label: s.t, value: s.impressions ?? s.views ?? s.reach ?? 0 })))
    : null;

  // EN QUÉ NIVEL CAE, contra el umbral declarado de SU canal. `sin-medir` y
  // `sin-umbral` no son juicios sobre la pieza: son que no se puede decir nada.
  const alcance = primaryReach(p);
  const umbrales = cargarUmbrales();
  const nivel = nivelDe(alcance, p.channel, umbrales);
  const umbral = umbrales[p.channel];

  // El perfil de la cuenta que publicó. Sale de los accesos de la marca, que ya
  // derivan la URL del handle declarado — no hay una segunda fuente de verdad.
  const perfil = p.cuenta
    ? accesosDe(source.brand).lista.find((a) => a.id === `cuenta:${p.cuenta}`)
    : undefined;

  // Abrir el .md donde se edita. El nombre del vault de Obsidian es el de su
  // carpeta, que es lo que Obsidian usa por defecto; si alguien lo renombró
  // adentro de Obsidian, el enlace no abre y no rompe nada más.
  const obsidian = `obsidian://open?vault=${encodeURIComponent(
    source.vault.split("/").filter(Boolean).pop() ?? "",
  )}&file=${encodeURIComponent(p.relPath.replace(/\.md$/, ""))}`;

  // Las columnas de la tabla de cortes que TIENEN dato en esta pieza. Un tweet no
  // tiene `views` ni `reach`, y un reel no tiene `imp` ni `rt`: diez columnas de
  // las cuales siete son rayas hacen ilegibles las tres que importan.
  const COLUMNAS = [
    { k: "views", get: (x: (typeof snaps)[number]) => x.views },
    { k: "reach", get: (x: (typeof snaps)[number]) => x.reach },
    { k: "imp", get: (x: (typeof snaps)[number]) => x.impressions },
    { k: "eng", get: (x: (typeof snaps)[number]) => x.engagements },
    { k: "detail", get: (x: (typeof snaps)[number]) => x.detailExpands },
    { k: "pv", get: (x: (typeof snaps)[number]) => x.profileVisits },
    { k: "likes", get: (x: (typeof snaps)[number]) => x.likes },
    { k: "rt", get: (x: (typeof snaps)[number]) => x.reposts },
    { k: "bmk", get: (x: (typeof snaps)[number]) => x.bookmarks },
  ].filter((c) => snaps.some((x) => c.get(x) !== null && c.get(x) !== undefined));

  const derived = l
    ? [
        { k: "Alcance", v: num(primaryReach(p)) },
        { k: "Eng rate", v: pct(engRate(l)) },
        { k: "Profile visits", v: `${num(l.profileVisits)} · ${pct(pvRate(l))}` },
        { k: "Save / like", v: pct(saveLike(l)), good: true },
        { k: "Follows", v: num(l.follows), good: true },
        { k: "Shares", v: num(l.shares) },
      ].filter((d) => d.v !== "—" && !d.v.startsWith("— ·"))
    : [];

  return (
    <>
      <PageHeader title={p.title} subtitle={[p.canal, p.cuenta, p.formato].filter(Boolean).join(" · ")} />

      <Link
        href={`/${account}/inventario`}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Inventario
      </Link>

      {/* LOS ACCESOS, TODOS JUNTOS Y EN UN SOLO LUGAR.
          Estaban en tres bloques distintos —el tablero arriba a la derecha, la
          url y Drive más abajo— y ninguno decía qué era cada uno. Son cuatro
          destinos y cada uno responde otra pregunta:

            publicada   dónde la ve la gente; es la llave del ingest
            Drive       dónde está el archivo con el que se publicó
            tablero     dónde se coordina su estado
            Obsidian    dónde se EDITA, que es lo único que esta app no hace

          Los dos primeros salen del .md y se validan: un `javascript:` en un
          href ejecuta al hacer click. Los dos últimos los arma esta app. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {esHttp(p.url) && (
          <Acceso href={p.url!} label={`Ver en ${hostDe(p.url!)}`} />
        )}
        {esHttp(p.driveUrl) && <Acceso href={p.driveUrl!} label="Video en Drive" />}
        {enlaceTablero && (
          <Acceso
            href={enlaceTablero}
            label="Tablero"
            title={diasEnlaces !== null ? `correspondencia de hace ${diasEnlaces} día(s)` : undefined}
          />
        )}
        {perfil && <Acceso href={perfil.url} label={perfil.detalle ?? perfil.label} />}
        {/* No es http, así que no pasa por `esHttp`: este enlace lo construye la
            app, no sale de ningún archivo. */}
        <a
          href={obsidian}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-foreground/25 hover:bg-muted"
          title="Abrir el .md en Obsidian, que es donde se edita"
        >
          Editar en Obsidian
        </a>
      </div>

      {/* Lo que NO se puede abrir se dice, en vez de desaparecer. */}
      {(!esHttp(p.url) || !enlaceTablero || (p.driveUrl && !esHttp(p.driveUrl))) && (
        <p className="mt-2 max-w-[74ch] text-[11px] leading-relaxed text-muted-foreground/70">
          {!esHttp(p.url) && (
            <>
              Sin <code>url</code> declarada — <strong>sin eso la pieza no se puede
              medir</strong>: es la llave del ingest y de cualquier atribución.{" "}
            </>
          )}
          {p.driveUrl && !esHttp(p.driveUrl) && (
            <>
              El <code>drive_url</code> no es un enlace http(s):{" "}
              <code>{p.driveUrl.slice(0, 50)}</code>.{" "}
            </>
          )}
          {!enlaceTablero && (
            <>
              {correspondencia
                ? "Esta app no conoce su fila del tablero — que no es lo mismo que no estar allá."
                : "La correspondencia con el tablero todavía no se generó."}
            </>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.formula && <Badge variant="outline">{p.formula}</Badge>}
        {p.estado && (
          <Badge variant={p.status === "published" ? "success" : "secondary"}>{p.estado}</Badge>
        )}
        {p.verdict && <Badge variant={verdictVariant(p.verdict)}>{p.verdict}</Badge>}
        {/* El nivel solo se muestra cuando ES un juicio. "sin medir" y "sin
            umbral" ya se leen en que el alcance es una raya. */}
        {(nivel === "viral" || nivel === "destacado") && umbral && (
          <Badge
            variant={nivel === "viral" ? "success" : "secondary"}
            title={`${nivel === "viral" ? "Viral" : "Destacada"} en ${p.channel}: desde ${num(
              nivel === "viral" ? umbral.viral : umbral.destacado ?? umbral.viral,
            )} de alcance`}
          >
            {nivel === "viral" ? "viral" : "destacada"}
          </Badge>
        )}
      </div>

      {/* LA FICHA. Son los campos del footer, que hasta ahora no se veían en
          ningún lado: había que abrir el .md para saber si una pieza tenía id,
          fecha o tags. Solo se listan los que EXISTEN — una ficha con ocho
          "—" no informa, y el vacío de un campo se ve mejor en la vista de
          deuda, que existe para eso. */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-border py-3 text-[12px] sm:grid-cols-3 md:grid-cols-4">
        {[
          { k: "id", v: p.id, mono: true },
          { k: "canal", v: p.canal ?? (p.channelDerived ? `${p.channel} (de la ruta)` : p.channel) },
          { k: "cuenta", v: p.cuenta },
          { k: "formato", v: p.formato },
          { k: "publicada", v: p.publishedAt },
          { k: "cobertura", v: p.coverage === "tracked" ? "medida" : p.coverage === "pending" ? "pendiente" : "sin trackear" },
          { k: "cortes", v: snaps.length ? String(snaps.length) : undefined },
          { k: "tags", v: p.tags },
        ]
          .filter((c) => c.v)
          .map((c) => (
            <div key={c.k}>
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{c.k}</dt>
              <dd className={`mt-0.5 truncate ${c.mono ? "font-mono" : ""}`} title={c.v!}>
                {c.v}
              </dd>
            </div>
          ))}
      </dl>

      {p.tldr && <p className="mt-4 max-w-[74ch] text-[13px] leading-relaxed text-muted-foreground">{p.tldr}</p>}

      <Card className="mt-5">
        <CardContent className="p-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{p.body}</div>
        </CardContent>
      </Card>

      {l && (
        <>
          {chart ? (
            <div className="mt-6 rounded-lg border border-border p-3">
              <div className="mb-1 px-1 text-[11px] text-muted-foreground">
                Alcance en el tiempo · {snaps.length} cortes
              </div>
              <div dangerouslySetInnerHTML={{ __html: chart }} />
            </div>
          ) : (
            // Un solo corte no es una serie. Dibujar el marco vacío alrededor de
            // un punto ocupa media pantalla para no decir nada.
            <p className="mt-6 text-[11px] text-muted-foreground/70">
              Un solo corte medido{snaps[0]?.date ? ` (${snaps[0].date})` : ""} — no hay
              evolución que mostrar todavía.
            </p>
          )}

          <div className="my-5 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3 md:grid-cols-6">
            {derived.map((d) => (
              <div key={d.k}>
                <div className="text-[11px] text-muted-foreground">{d.k}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${d.good ? "text-[var(--tg-green)]" : ""}`}>{d.v}</div>
              </div>
            ))}
          </div>

          {/* Solo las columnas CON DATOS de esta pieza. Un tweet no tiene
              `views` ni `reach`, y un reel no tiene `imp` ni `rt`: diez columnas
              de las cuales siete son rayas hacen ilegibles las tres que importan. */}
          <Table className="font-mono text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>corte</TableHead>
                {COLUMNAS.map((c) => (
                  <TableHead key={c.k} className="text-right">{c.k}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {snaps.map((x, i) => (
                <TableRow key={i}>
                  <TableCell className="text-primary">{x.t}</TableCell>
                  {COLUMNAS.map((c) => (
                    <TableCell key={c.k} className="text-right">{num(c.get(x))}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* SIN UN SOLO CORTE, LA PÁGINA TERMINABA ACÁ. Eran 87 de 129 piezas: la
          mayoría de las páginas de este dashboard eran un título, un cuerpo y una
          ruta. Que no haya números no es "no hay nada que decir" — es lo que hay
          que decir, y con qué falta para que deje de pasar. */}
      {!l && (
        <div className="mt-6 rounded-lg border border-border p-5">
          <p className="text-sm">
            Esta pieza <strong>no tiene ningún corte medido</strong>.
          </p>
          <ul className="mt-2.5 max-w-[74ch] space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {!esHttp(p.url) && (
              <li>
                · Le falta la <code>url</code>, y es lo primero: es la llave con la que la
                ingesta empareja un export con esta pieza. Sin eso no hay nada que cruzar.
              </li>
            )}
            {esHttp(p.url) && (
              <li>
                · Tiene <code>url</code>, así que solo falta correr la ingesta con un export
                de {p.channel}. Los cortes se escriben en el <code>.md</code>, no acá.
              </li>
            )}
            {p.status !== "published" && (
              <li>
                · Su estado es <strong>{p.estado ?? p.status}</strong>. Una pieza que no se
                publicó no tiene qué medir todavía, y eso no es deuda.
              </li>
            )}
            {p.status === "published" && (
              <li>
                · Está publicada{p.publishedAt ? ` desde ${p.publishedAt}` : ""}, así que sí
                cuenta como deuda de medición.
              </li>
            )}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
            El nivel de viralidad tampoco se puede decir: es{" "}
            <strong>sin medir</strong>, que no es lo mismo que no ser viral.
          </p>
        </div>
      )}

      {(p.verdict || p.why || (p.drivers && p.drivers.length > 0)) && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Análisis</span>
            {p.verdict && <Badge variant={verdictVariant(p.verdict)}>{p.verdict}</Badge>}
          </div>
          {p.drivers && p.drivers.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {p.drivers.map((d) => (
                <Badge key={d} variant="outline">
                  {d}
                </Badge>
              ))}
            </div>
          )}
          {p.why && <p className="text-[13px] leading-relaxed text-muted-foreground">{p.why}</p>}
          {p.lesson && (
            <p className="mt-2 text-[13px] leading-relaxed">
              <span className="text-muted-foreground">Lección: </span>
              {p.lesson}
            </p>
          )}
        </div>
      )}

      {variantes.length > 1 && (
        <div className="mt-6">
          <div className="mb-2 flex items-baseline gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Variantes de esta pieza
            </h2>
            <span className="text-[11px] text-muted-foreground/60">
              mismo post, {variantes.length} formas
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground/70">
                  <th className="px-3 py-2 text-left font-normal">variante</th>
                  <th className="px-2 py-2 text-right font-normal">alcance</th>
                  <th className="px-2 py-2 text-right font-normal">eng</th>
                  <th className="px-2 py-2 text-right font-normal">guardados</th>
                  <th className="px-3 py-2 text-right font-normal">follows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variantes.map((v) => {
                  const esta = v.variante.piece.slug === p.slug;
                  return (
                    <tr key={v.variante.piece.slug} className={esta ? "bg-secondary/50" : undefined}>
                      <td className="px-3 py-2">
                        <Link
                          href={`/${account}/piezas/${v.variante.piece.slug}`}
                          className="hover:underline"
                        >
                          <span className="font-mono text-muted-foreground">
                            {v.variante.sufijo || "orig"}
                          </span>
                          <span className="ml-2">{v.variante.piece.title}</span>
                        </Link>
                        {v.gana && (
                          <Badge variant="success" className="ml-2">más alcance</Badge>
                        )}
                        {esta && <span className="ml-2 text-[11px] text-muted-foreground">esta</span>}
                      </td>
                      {/* Una variante sin medir muestra raya, no cero: no perdió,
                          todavía no compitió. */}
                      <td className="px-2 py-2 text-right tabular-nums">{num(v.alcance)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{num(v.engagements)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{num(v.bookmarks)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{num(v.follows)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
            Las variantes son el mismo post contado de otra forma, así que la
            diferencia entre sus números es la forma. Las que no tienen alcance medido
            no perdieron: todavía no compitieron.
          </p>
        </div>
      )}

      {p.note && (
        <p className="mt-5 border-l border-border pl-3.5 text-xs leading-relaxed text-muted-foreground">{p.note}</p>
      )}

      <div className="mt-8 text-[11px] text-muted-foreground/60">
        <code>{p.relPath}</code>
      </div>
    </>
  );
}
