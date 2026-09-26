"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Filtros, {
  aplicarFiltros,
  FILTROS_VACIOS,
  type EstadoFiltros,
  type Opcion,
} from "@/components/Filtros";
import MateriaToggle from "@/components/MateriaToggle";
import { useFavoritos } from "@/components/useFavoritos";
import { facetas, type Materia, type Unidad } from "@/lib/unidades";
import { NIVELES, describir, type Umbrales } from "@/lib/viralidad";
import { esHttp } from "@/lib/enlaces";

/**
 * El inventario: TODAS las piezas, incluidas las que no tienen footer ni
 * métricas. Esconder las no medidas es lo que hacía que el agujero real —el
 * canal casi vacío— no se viera.
 *
 * TRES VISTAS, y la de tablero NO duplica el kanban de coordinación.
 *
 * Antes esto eran dos pantallas. `/piezas` traía las mismas filas filtradas por
 * `coverage === 'tracked'` y las dibujaba con sus números; o sea, un SUBCONJUNTO
 * de este mismo conjunto con otra presentación. Pero la cobertura ya es un filtro
 * de esta barra, así que la diferencia real era el renderizado — y eso es un
 * toggle, no una entrada de nav. Tenerlas separadas obligaba además a duplicar
 * cada filtro nuevo en las dos.
 *
 * El tablero de Notion agrupa por el carril operativo y tiene corte a 60 días:
 * es para coordinar qué se está produciendo. Este agrupa por las dimensiones que
 * Notion NO tiene —cobertura de medición, fórmula, canal— sobre las piezas
 * completas, incluidas las viejas que allá ya no suben. Si lo único que se
 * quiere es mover una tarjeta de carril, eso se hace en Notion.
 */

export type InventarioRow = Unidad;

const ORDENES: Opcion[] = [
  { value: "ruta", label: "Por ubicación" },
  { value: "alcance", label: "Más alcance" },
  { value: "alcance-asc", label: "Menos alcance" },
  { value: "reciente", label: "Más reciente" },
  { value: "antigua", label: "Más antigua" },
  { value: "titulo", label: "Título" },
  { value: "cortes", label: "Más medida" },
];

type Vista = "tabla" | "metricas" | "tablero";

/** Las opciones del filtro de viralidad, con el conteo de lo que hay. */
function facetaNiveles(filas: Unidad[]): Opcion[] {
  const m = new Map<string, number>();
  for (const f of filas) m.set(f.nivel, (m.get(f.nivel) ?? 0) + 1);
  // En el orden de NIVELES —de viral a sin umbral— y no por cantidad: es una
  // progresión que significa algo, como la cobertura.
  return NIVELES.filter((n) => m.has(n.value)).map((n) => ({
    value: n.value,
    label: n.label,
    count: m.get(n.value),
  }));
}

const variantePorVeredicto = (v: string): "success" | "destructive" | "secondary" => {
  const s = v.toLowerCase();
  if (["breakout", "strong", "solid"].includes(s)) return "success";
  if (["weak", "flop"].includes(s)) return "destructive";
  return "secondary";
};

/**
 * Los accesos rápidos de una fila: el post publicado y el master en Drive.
 *
 * Solo se dibuja el que EXISTE y es http(s). El valor sale de un .md que escribe
 * una persona y termina en un `href` — un `javascript:` ahí ejecuta al hacer
 * click— y un ícono que no lleva a ningún lado es peor que su ausencia: promete
 * y falla.
 *
 * `stopPropagation` porque la fila entera navega al detalle: sin eso, abrir el
 * post también cambiaría la página de atrás.
 */
function Enlaces({ url, driveUrl }: { url: string; driveUrl: string }) {
  const hay = esHttp(url) || esHttp(driveUrl);
  if (!hay) return null;
  const base =
    "rounded px-1 text-[12px] leading-none text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground";
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {esHttp(url) && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Ver la pieza publicada"
          aria-label="Ver la pieza publicada"
          className={base}
        >
          <span aria-hidden="true">↗</span>
        </a>
      )}
      {esHttp(driveUrl) && (
        <a
          href={driveUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Abrir el video en Drive"
          aria-label="Abrir el video en Drive"
          className={base}
        >
          <span aria-hidden="true">▶</span>
        </a>
      )}
    </span>
  );
}

/** La estrella de favorito. Es un botón y no un Link: la fila entera ya navega. */
function Estrella({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "Quitar de favoritos" : "Marcar como favorito"}
      title={on ? "Quitar de favoritos" : "Marcar como favorito"}
      className={`shrink-0 rounded px-1 text-[13px] leading-none transition-colors hover:bg-muted ${
        on ? "text-[var(--tg-green)]" : "text-muted-foreground/30"
      }`}
    >
      <span aria-hidden="true">{on ? "★" : "☆"}</span>
    </button>
  );
}

const COBERTURA: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  tracked: { label: "medida", variant: "success" },
  pending: { label: "pendiente", variant: "secondary" },
  untracked: { label: "sin trackear", variant: "outline" },
};

/** Las dimensiones por las que se puede agrupar el tablero. */
type Agrupacion = "coverage" | "status" | "canal" | "formulaCode" | "persona" | "angulo" | "ronda";

const AGRUPACIONES: { value: Agrupacion; label: string; orden: string[]; materia: "organico" | "ads" | "ambas" }[] = [
  { value: "coverage", label: "Cobertura", orden: ["tracked", "pending", "untracked"], materia: "organico" },
  { value: "status", label: "Estado", orden: ["published", "in-progress", "draft", "idea", "backlog", "unknown"], materia: "organico" },
  { value: "formulaCode", label: "Fórmula", orden: [], materia: "organico" },
  { value: "canal", label: "Red", orden: [], materia: "ambas" },
  // Las dimensiones de campañas: un creativo se organiza por persona × dolor ×
  // ángulo, no por fórmula.
  { value: "persona", label: "Persona", orden: [], materia: "ads" },
  { value: "angulo", label: "Ángulo", orden: [], materia: "ads" },
  { value: "ronda", label: "Ronda", orden: [], materia: "ads" },
];

const ETIQUETA: Record<string, string> = {
  tracked: "Medidas",
  pending: "Pendientes",
  untracked: "Sin trackear",
  published: "Publicadas",
  "in-progress": "En curso",
  draft: "Draft",
  idea: "Idea",
  backlog: "Backlog",
  unknown: "Sin estado",
  "": "Sin asignar",
};

export default function InventarioClient({
  rows,
  creativos = [],
  account,
  umbrales = {},
}: {
  rows: InventarioRow[];
  creativos?: InventarioRow[];
  /** La marca, para que los favoritos de una no aparezcan en otra. */
  account: string;
  umbrales?: Umbrales;
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);
  const [materia, setMateria] = useState<Materia>("organico");
  const [vista, setVista] = useState<Vista>("tabla");
  const [agrupar, setAgrupar] = useState<Agrupacion>("coverage");
  const { favoritos, alternar } = useFavoritos(account);

  const esAds = materia === "ads";
  const universo = esAds ? creativos : rows;
  // Las facetas salen del conjunto ACTIVO: con ads no tiene sentido ofrecer
  // fórmulas, y con orgánico no tiene sentido ofrecer personas.
  const canales = facetas(universo, "canal");
  const formulas = esAds ? [] : facetas(universo, "formulaCode");
  const personas = esAds ? facetas(universo, "persona") : [];
  const angulos = esAds ? facetas(universo, "angulo") : [];
  const rondas = esAds ? facetas(universo, "ronda") : [];
  // Un creativo no tiene nivel de viralidad ni en principio: no se mide con las
  // métricas del orgánico. En ads el filtro desaparece solo.
  const niveles = esAds ? [] : facetaNiveles(universo);

  const filas = useMemo(() => {
    const out = aplicarFiltros(universo, f, favoritos);
    const porFecha = (a: InventarioRow, b: InventarioRow) =>
      (b.publishedAt || "").localeCompare(a.publishedAt || "");
    switch (f.orden) {
      case "alcance":
        return [...out].sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1));
      case "alcance-asc":
        // Las no medidas al final en los DOS sentidos: `null` no es "menos
        // alcance que 0", es que nadie lo midió, y encabezar la lista de "menos
        // alcance" con piezas sin medir respondería otra pregunta.
        return [...out].sort(
          (a, b) => (a.alcance ?? Infinity) - (b.alcance ?? Infinity),
        );
      case "reciente":
        return [...out].sort(porFecha);
      case "antigua":
        return [...out].sort((a, b) => -porFecha(a, b));
      case "titulo":
        return [...out].sort((a, b) => a.title.localeCompare(b.title));
      case "cortes":
        return [...out].sort((a, b) => b.cortes - a.cortes);
      default:
        // En la vista de métricas el orden natural es por alcance: pone adelante
        // las que tienen números y deja atrás las que son todas rayas.
        return vista === "metricas"
          ? [...out].sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1))
          : out;
    }
  }, [universo, f, favoritos, vista]);

  // Si NINGUNA fila tiene serie, la columna entera sobra: con un solo corte por
  // pieza, repetir "1 corte" en 72 filas es ruido que no dice nada nuevo.
  const haySeries = filas.some((r) => r.sparkHtml);

  const columnas = useMemo(() => {
    const def = AGRUPACIONES.find((a) => a.value === agrupar)!;
    const grupos = new Map<string, InventarioRow[]>();
    for (const r of filas) {
      const k = (r[agrupar] as string) ?? "";
      grupos.set(k, [...(grupos.get(k) ?? []), r]);
    }
    const claves = [...grupos.keys()];
    // El orden declarado primero (cobertura y estado tienen una progresión que
    // significa algo); lo demás, por cantidad.
    claves.sort((a, b) => {
      const ia = def.orden.indexOf(a);
      const ib = def.orden.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return (grupos.get(b)?.length ?? 0) - (grupos.get(a)?.length ?? 0);
    });
    return claves.map((k) => ({ clave: k, label: ETIQUETA[k] ?? (k || "Sin asignar"), filas: grupos.get(k)! }));
  }, [filas, agrupar]);

  return (
    <>
      <MateriaToggle
        valor={materia}
        onChange={(m) => {
          setMateria(m);
          // Los filtros se limpian al cambiar de materia: una faceta de ads
          // seleccionada no significa nada en orgánico, y dejarla puesta
          // mostraría una lista vacía sin motivo visible.
          setF(FILTROS_VACIOS);
          if (m === "ads") {
            setAgrupar("persona");
            // La vista de métricas no existe en ads, y quedarse en ella dejaría
            // la pantalla en blanco sin decir por qué.
            setVista((v) => (v === "metricas" ? "tabla" : v));
          } else setAgrupar("coverage");
        }}
        conteos={{ organico: rows.length, ads: creativos.length }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={vista}
          onValueChange={(v) => v && setVista(v as Vista)}
        >
          <ToggleGroupItem value="tabla" aria-label="Vista de tabla">Tabla</ToggleGroupItem>
          {/* La vista que antes era la pantalla /piezas. En ads no existe: un
              creativo no tiene ninguno de estos números. */}
          {!esAds && (
            <ToggleGroupItem value="metricas" aria-label="Vista de métricas">Métricas</ToggleGroupItem>
          )}
          <ToggleGroupItem value="tablero" aria-label="Vista de tablero">Tablero</ToggleGroupItem>
        </ToggleGroup>

        {f.niveles.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Umbral de viral por canal: {describir(umbrales)}. Se declara en{" "}
          <code>config/viralidad.json</code> — no lo deriva la app, porque &ldquo;viral&rdquo;
          significa algo distinto en cada red.
        </p>
      )}

      {vista === "tablero" && (
          <Select value={agrupar} onValueChange={(v) => setAgrupar(v as Agrupacion)}>
            <SelectTrigger className="w-[9.5rem]" aria-label="Agrupar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGRUPACIONES.filter((a) => a.materia === "ambas" || a.materia === materia).map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  Agrupar: {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Filtros
        estado={f}
        onChange={setF}
        canales={canales}
        formulas={formulas}
        personas={personas}
        angulos={angulos}
        rondas={rondas}
        ordenes={ORDENES}
        conCobertura={!esAds}
        conFechas={!esAds}
        niveles={niveles}
        umbrales={esAds ? {} : umbrales}
        favoritos={favoritos.size}
        resultados={filas.length}
        total={universo.length}
      />

      {filas.length === 0 ? (
        <div className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
          {/* Distinguir los dos vacíos importa: "no marcaste ninguna" es una
              instrucción, "no pasa nada los filtros" es un callejón. */}
          {f.soloFavoritos && favoritos.size === 0
            ? "Todavía no marcaste ninguna como favorita. La estrella de cada fila las guarda en este navegador."
            : "Ninguna pieza pasa estos filtros."}
        </div>
      ) : vista === "tabla" ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{esAds ? "creativo" : "pieza"}</TableHead>
                {esAds ? (
                  <>
                    <TableHead className="hidden w-24 sm:table-cell">persona</TableHead>
                    <TableHead className="hidden w-16 md:table-cell">dolor</TableHead>
                    <TableHead className="hidden w-32 md:table-cell">ángulo</TableHead>
                    <TableHead className="w-24">formato</TableHead>
                    <TableHead className="w-28 text-right">ronda</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="hidden w-24 sm:table-cell">red</TableHead>
                    <TableHead className="hidden w-16 md:table-cell">fórmula</TableHead>
                    <TableHead className="hidden w-24 md:table-cell">fecha</TableHead>
                    <TableHead className="w-28">cobertura</TableHead>
                    <TableHead className="w-12 text-right">cortes</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((r) => {
                const cob = COBERTURA[r.coverage] ?? COBERTURA.untracked;
                return (
                  <TableRow key={r.llave}>
                    <TableCell className="max-w-0">
                      <div className="flex items-center gap-1.5">
                        <Estrella on={favoritos.has(r.llave)} onClick={() => alternar(r.llave)} />
                        <Link href={r.href} className="min-w-0 flex-1 truncate text-[13px] hover:underline">
                          {r.title}
                        </Link>
                        <Enlaces url={r.url} driveUrl={r.driveUrl} />
                      </div>
                      {r.estado && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {r.estado}
                        </span>
                      )}
                    </TableCell>
                    {esAds ? (
                      <>
                        <TableCell className="hidden text-[13px] sm:table-cell">
                          {r.persona || "—"}
                          {r.publico && (
                            <span className="ml-1.5 text-[11px] text-muted-foreground">{r.publico}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-[13px] text-muted-foreground md:table-cell">
                          {r.dolor || "—"}
                        </TableCell>
                        <TableCell className="hidden text-[13px] text-muted-foreground md:table-cell">
                          {r.angulo || "—"}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {r.formato || "—"}
                        </TableCell>
                        <TableCell className="text-right text-[11px] text-muted-foreground">
                          {r.ronda || "—"}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="hidden text-[13px] text-muted-foreground sm:table-cell">
                          {r.canal}
                        </TableCell>
                        <TableCell className="hidden font-mono text-[13px] text-muted-foreground md:table-cell">
                          {r.formulaCode || "—"}
                        </TableCell>
                        <TableCell className="hidden tabular-nums text-[13px] text-muted-foreground md:table-cell">
                          {r.publishedAt || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cob.variant}>{cob.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13px] text-muted-foreground">
                          {/* Cero cortes es raya: no se midió cero, no se midió. */}
                          {r.cortes || "—"}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : vista === "metricas" ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="hidden items-center gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground/70 md:flex">
            <span className="flex-1">pieza</span>
            {haySeries && <span className="w-[108px] shrink-0">evolución</span>}
            <span className="w-20 shrink-0 text-right">alcance</span>
            <span className="w-14 shrink-0 text-right">eng</span>
            <span className="w-14 shrink-0 text-right">save/like</span>
            <span className="w-12 shrink-0 text-right">follows</span>
          </div>

          <div className="divide-y divide-border">
            {filas.map((r) => (
              <div
                key={r.llave}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap"
              >
                <div className="flex min-w-0 flex-1 items-start gap-1.5">
                  <Estrella on={favoritos.has(r.llave)} onClick={() => alternar(r.llave)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link href={r.href} className="min-w-0 truncate text-[13px] font-medium hover:underline">
                        {r.title}
                      </Link>
                      <Enlaces url={r.url} driveUrl={r.driveUrl} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{r.canal}</span>
                      {r.formulaCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono" title={r.formula}>{r.formulaCode}</span>
                        </>
                      )}
                      {r.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{r.publishedAt}</span>
                        </>
                      )}
                      {/* El nivel de viralidad solo se muestra cuando es un
                          juicio: "sin medir" y "sin umbral" ya se leen en que el
                          alcance es una raya, y repetirlos sería ruido. */}
                      {(r.nivel === "viral" || r.nivel === "destacado") && (
                        <Badge variant={r.nivel === "viral" ? "success" : "secondary"}>
                          {r.nivel === "viral" ? "viral" : "destacada"}
                        </Badge>
                      )}
                      {r.verdict && (
                        <Badge variant={variantePorVeredicto(r.verdict)}>{r.verdict}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* El sparkline solo existe con dos cortes o más: una serie de un
                    punto no es una serie. */}
                {haySeries && (
                  <div className="w-[108px] shrink-0" title={`${r.cortes} corte(s) medidos`}>
                    {r.sparkHtml ? (
                      <span dangerouslySetInnerHTML={{ __html: r.sparkHtml }} />
                    ) : (
                      <span aria-hidden="true" className="text-muted-foreground/25">—</span>
                    )}
                  </div>
                )}

                <span className="w-20 shrink-0 text-right text-[13px] font-medium tabular-nums">
                  {r.alcanceFmt}
                </span>
                <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                  {r.engRate}
                </span>
                <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-[var(--tg-green)]">
                  {r.saveLike}
                </span>
                <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-[var(--tg-green)]">
                  {r.followsFmt}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {columnas.map((col) => (
            <section key={col.clave} className="flex w-[15.5rem] shrink-0 flex-col">
              <header className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <h3 className="truncate text-[13px] font-medium">{col.label}</h3>
                <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                  {col.filas.length}
                </span>
              </header>
              <div className="flex flex-col gap-1.5">
                {col.filas.slice(0, 60).map((r) => (
                  <div
                    key={r.llave}
                    className="rounded-md border border-border bg-background px-2.5 py-2 transition-colors hover:bg-secondary"
                  >
                    <div className="flex items-start gap-1.5">
                      <Estrella on={favoritos.has(r.llave)} onClick={() => alternar(r.llave)} />
                      <Link href={r.href} className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug hover:underline">
                        {r.title}
                      </Link>
                      <Enlaces url={r.url} driveUrl={r.driveUrl} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                      <span>{r.canal}</span>
                      {r.formulaCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{r.formulaCode}</span>
                        </>
                      )}
                      {r.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{r.publishedAt}</span>
                        </>
                      )}
                      {r.cortes > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{r.cortes} cortes</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {col.filas.length > 60 && (
                  <p className="px-1 text-[11px] text-muted-foreground/70">
                    y {col.filas.length - 60} más — afiná los filtros
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {f.niveles.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Umbral de viral por canal: {describir(umbrales)}. Se declara en{" "}
          <code>config/viralidad.json</code> — no lo deriva la app, porque &ldquo;viral&rdquo;
          significa algo distinto en cada red.
        </p>
      )}

      {vista === "tablero" && (
        <p className="mt-4 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
          Este tablero <strong>no reemplaza al de coordinación</strong>: agrupa por
          cobertura de medición, fórmula y red —que el tablero de Notion no tiene— sobre
          las piezas completas, incluidas las publicadas hace más de 60 días que allá ya
          no suben. Mover una pieza de carril se sigue haciendo en Notion.
        </p>
      )}
    </>
  );
}
