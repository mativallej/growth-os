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
import { Desplegable } from "@/components/ui/accordion";
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
import { useFavoritos, type Favoritos } from "@/components/useFavoritos";
import { facetas, type Corte, type Materia, type Unidad } from "@/lib/unidades";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  abrir,
  alternar as alternarSeleccion,
  cambiarModo,
  limpiar,
  MAXIMO,
  type Modo,
} from "@/store/seleccion";
import { Drawer } from "@/components/ui/drawer";
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

type Vista = "tabla" | "metricas" | "tablero" | "campanas";

/**
 * Una campaña: las piezas que comparten carpeta.
 *
 * El vault ya las agrupa así —los reels de un lanzamiento, los carruseles de una
 * serie viven juntos— y hasta ahora el inventario las mostraba como 126 filas
 * sueltas. Comparar dos piezas de la misma tanda dice algo; dos de carpetas
 * distintas son temas distintos.
 */
type Campana = {
  carpeta: string;
  nombre: string;
  filas: InventarioRow[];
  medidas: number;
  /** Suma del alcance DE LAS MEDIDAS. Ver el comentario de `agrupadas`. */
  alcance: number;
  desde: string;
  hasta: string;
  canales: string[];
};

/** Agrupa las filas por carpeta y resume cada grupo. */
function porCampana(filas: InventarioRow[]): Campana[] {
  const m = new Map<string, InventarioRow[]>();
  for (const r of filas) m.set(r.carpeta, [...(m.get(r.carpeta) ?? []), r]);

  return [...m.entries()]
    .map(([carpeta, rs]) => {
      const fechas = rs.map((r) => r.publishedAt).filter(Boolean).sort();
      return {
        carpeta,
        // El último tramo es el nombre; la ruta entera queda como detalle. Dos
        // campañas de redes distintas pueden llamarse igual —`A - Storytelling
        // de tercero` está en Story y en Carrusel— así que la llave es la ruta.
        nombre: carpeta.split("/").pop() || "Raíz",
        filas: rs,
        medidas: rs.filter((r) => r.coverage === "tracked").length,
        // SOLO LAS MEDIDAS. Sumar tratando el `null` como 0 diría que la campaña
        // alcanzó menos de lo que alcanzó, y ese número se leería como un dato.
        // Por eso al lado siempre va cuántas de cuántas están medidas.
        alcance: rs.reduce((t, r) => t + (r.alcance ?? 0), 0),
        desde: fechas[0] ?? "",
        hasta: fechas[fechas.length - 1] ?? "",
        canales: [...new Set(rs.map((r) => r.canal))].sort(),
      };
    })
    .sort((a, b) => {
      // Lo más reciente arriba: una campaña de esta semana importa más que una
      // de hace un año. Las sin fecha al final, no primero.
      if (a.hasta !== b.hasta) return a.hasta && b.hasta ? b.hasta.localeCompare(a.hasta) : a.hasta ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
}

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
/**
 * La estrella de favorito, que ahora es COMPARTIDA.
 *
 * `otros` es quién más la marcó. Que se vea es el punto de haberlos movido a una
 * base: una estrella privada es una nota personal, una que dice "esto también lo
 * marcó tu socio" es una señal. Se dibuja distinto de la propia —un punto al lado,
 * no la estrella llena— para no confundir "la marqué yo" con "la marcó alguien".
 */
function Estrella({
  on,
  otros,
  onClick,
}: {
  on: boolean;
  otros?: string[];
  onClick: () => void;
}) {
  const deOtros = otros?.length ?? 0;
  const titulo = on
    ? "Quitar de favoritos"
    : deOtros > 0
      ? `Marcar como favorito · también la marcó ${otros!.join(", ")}`
      : "Marcar como favorito";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={titulo}
      title={titulo}
      className={`relative shrink-0 rounded px-1 text-[13px] leading-none transition-colors hover:bg-muted ${
        on ? "text-[var(--tg-green)]" : "text-muted-foreground/30"
      }`}
    >
      <span aria-hidden="true">{on ? "★" : "☆"}</span>
      {deOtros > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 size-1.5 rounded-full bg-primary"
        />
      )}
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

/**
 * Una fila de la tabla. Vive afuera del componente grande porque ahora se dibuja
 * en dos lugares: la tabla plana y, adentro de cada campaña, la tabla de esa
 * tanda. Definirla durante el render —como una función adentro del padre— es lo
 * que el React Compiler rechaza y además remontaría el subárbol en cada cambio
 * de filtro.
 */
function FilaInventario({
  r,
  esAds,
  fav,
}: {
  r: InventarioRow;
  esAds: boolean;
  fav: Favoritos;
}) {
  const cob = COBERTURA[r.coverage] ?? COBERTURA.untracked;
  const [abierto, setAbierto] = useState(false);
  const hayCortes = r.cortesDetalle.length > 0;

  return (
    <>
    <TableRow>
      <TableCell className="max-w-0">
        <div className="flex items-center gap-1.5">
          <Casilla llave={r.llave} modo="piezas" />
          <Estrella
            on={fav.favoritos.has(r.llave)}
            otros={fav.quienes.get(r.llave)}
            onClick={() => fav.alternar(r.llave)}
          />
          <Link href={r.href} className="min-w-0 flex-1 truncate text-[13px] hover:underline">
            {r.title}
          </Link>
          <Enlaces url={r.url} driveUrl={r.driveUrl} />
        </div>
        {r.estado && (
          <span className="block truncate text-[11px] text-muted-foreground">{r.estado}</span>
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
          <TableCell className="text-[13px] text-muted-foreground">{r.formato || "—"}</TableCell>
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
          <TableCell className="p-0 text-right">
            {/* El número abre los cortes. Antes decía `4` y no había forma de ver
                cuáles cuatro sin abrir la pieza — y el sentido de tomar cortes es
                justamente comparar el +1h con el +24h. */}
            {hayCortes ? (
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                className="flex w-full items-center justify-end gap-1 px-2 py-2 text-[13px] tabular-nums text-muted-foreground hover:text-foreground"
                title={abierto ? "Ocultar los cortes" : `Ver los ${r.cortes} cortes`}
              >
                {r.cortes}
                <svg
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  className={cn("size-2.5 transition-transform", abierto && "rotate-90")}
                >
                  <path d="M4.5 2 8.5 6 4.5 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              // Cero cortes es raya: no se midió cero, no se midió. Y sin cortes
              // no hay nada que desplegar, así que tampoco es un botón.
              <span className="block px-2 py-2 text-[13px] tabular-nums text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      )}
    </TableRow>

    {abierto && (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={7} className="bg-secondary/40 p-0">
          <Cortes cortes={r.cortesDetalle} />
        </TableCell>
      </TableRow>
    )}
    </>
  );
}

/**
 * Los cortes de una pieza, adentro de su fila.
 *
 * Una tabla propia y no una lista: son la misma medición repetida en el tiempo, y
 * lo que se hace con ellos es leer la columna para abajo —cuánto creció el
 * alcance entre el +1h y el +24h—. Una lista obliga a saltar de renglón.
 *
 * La CUENTA aparece solo si algún corte la declara. Una pieza cross-posteada
 * lleva un corte por cuenta y sin esa columna dos mediciones de redes distintas
 * se leen como la misma pieza medida dos veces; en una pieza de una sola cuenta,
 * la columna sería seis veces el mismo valor.
 */
function Cortes({ cortes }: { cortes: Corte[] }) {
  const hayCuenta = cortes.some((c) => c.cuenta);
  return (
    <div className="overflow-x-auto px-3 py-2">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground/70">
            <th className="py-1 pr-3 font-normal">corte</th>
            <th className="py-1 pr-3 font-normal">fecha</th>
            {hayCuenta && <th className="py-1 pr-3 font-normal">cuenta</th>}
            <th className="py-1 pr-3 text-right font-normal">alcance</th>
            <th className="py-1 pr-3 text-right font-normal">eng</th>
            <th className="hidden py-1 pr-3 text-right font-normal sm:table-cell">eng %</th>
            <th className="hidden py-1 pr-3 text-right font-normal sm:table-cell">likes</th>
            <th className="hidden py-1 pr-3 text-right font-normal md:table-cell">guard.</th>
            <th className="hidden py-1 text-right font-normal md:table-cell">follows</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {cortes.map((c, i) => (
            <tr key={`${c.t}-${i}`}>
              <td className="py-1.5 pr-3 font-mono">{c.t}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{c.fecha}</td>
              {hayCuenta && (
                <td className="py-1.5 pr-3 text-muted-foreground">{c.cuenta || "—"}</td>
              )}
              <td className="py-1.5 pr-3 text-right tabular-nums">{c.alcance}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{c.engagements}</td>
              <td className="hidden py-1.5 pr-3 text-right tabular-nums text-muted-foreground sm:table-cell">{c.engRate}</td>
              <td className="hidden py-1.5 pr-3 text-right tabular-nums text-muted-foreground sm:table-cell">{c.likes}</td>
              <td className="hidden py-1.5 pr-3 text-right tabular-nums text-muted-foreground md:table-cell">{c.guardados}</td>
              <td className="hidden py-1.5 text-right tabular-nums text-muted-foreground md:table-cell">{c.follows}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El encabezado de la tabla, que también se repite adentro de cada campaña. */
function CabeceraInventario({ esAds }: { esAds: boolean }) {
  return (
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
  );
}

/**
 * La casilla de "comparar esto".
 *
 * Lee del store y no de una prop porque quien necesita el dato —la barra de
 * acciones y el drawer— no es ni padre ni hijo de esta fila. Ver
 * `src/store/seleccion.ts`.
 *
 * Deshabilitada al llegar al máximo, en vez de sacar la más vieja para hacer
 * lugar: descartar en silencio algo que la persona eligió es peor que no agregar
 * lo nuevo. El `title` dice por qué no se puede.
 */
function Casilla({ llave, modo }: { llave: string; modo: Modo }) {
  const d = useAppDispatch();
  const sel = useAppSelector((e) => e.seleccion);
  const elegida = sel.modo === modo && sel.llaves.includes(llave);
  const lleno = sel.modo === modo && sel.llaves.length >= MAXIMO && !elegida;

  return (
    <input
      type="checkbox"
      checked={elegida}
      disabled={lleno}
      onChange={() => {
        // Cambiar de modo vacía lo elegido: dos piezas y una campaña no se
        // dibujan en columnas comparables.
        if (sel.modo !== modo) d(cambiarModo(modo));
        d(alternarSeleccion(llave));
      }}
      onClick={(e) => e.stopPropagation()}
      aria-label={elegida ? "Sacar de la comparación" : "Agregar a la comparación"}
      title={lleno ? `Hasta ${MAXIMO} a la vez` : "Comparar"}
      className="size-3.5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-30"
    />
  );
}

/**
 * UNA FILA DEL COMPARADOR: un dato, una columna por cosa comparada.
 *
 * `máx` marca el mayor ENTRE LOS MEDIDOS. Una pieza sin números no pierde:
 * todavía no compite. Marcarla como peor sería leer "no medido" como "midió
 * poco", que es el error que la regla dura 5 existe para no cometer — y es la
 * misma decisión que `compararVariantes` ya toma en el detalle de una pieza.
 */
function FilaComparada({
  etiqueta,
  valores,
  crudos,
}: {
  etiqueta: string;
  valores: string[];
  /** Los números detrás del texto, para saber cuál gana. `null` = sin medir. */
  crudos?: (number | null)[];
}) {
  const medidos = (crudos ?? []).filter((v): v is number => v !== null);
  const tope = medidos.length > 1 ? Math.max(...medidos) : null;

  return (
    <tr className="border-t border-border">
      <th className="w-24 py-2 pr-3 text-left align-top text-[11px] font-normal uppercase tracking-wide text-muted-foreground/70">
        {etiqueta}
      </th>
      {valores.map((v, i) => {
        const gana = tope !== null && crudos?.[i] === tope;
        return (
          <td
            key={i}
            className={cn(
              "py-2 pr-4 align-top text-[13px] tabular-nums",
              gana ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {v}
            {gana && <span className="ml-1 text-[10px] text-muted-foreground/60">máx</span>}
          </td>
        );
      })}
    </tr>
  );
}

/** El comparador de piezas: una columna por pieza, una fila por dato. */
function CompararPiezas({ filas }: { filas: InventarioRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse">
        <thead>
          <tr>
            <th />
            {filas.map((r) => (
              <th key={r.llave} className="pb-2 pr-4 text-left align-bottom">
                <Link
                  href={r.href}
                  className="block max-w-[14rem] text-[13px] font-medium hover:underline"
                >
                  {r.title}
                </Link>
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  {r.canal}
                  {r.formulaCode && ` · ${r.formulaCode}`}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <FilaComparada etiqueta="fecha" valores={filas.map((r) => r.publishedAt || "—")} />
          <FilaComparada
            etiqueta="cobertura"
            valores={filas.map((r) => (COBERTURA[r.coverage] ?? COBERTURA.untracked).label)}
          />
          <FilaComparada
            etiqueta="cortes"
            valores={filas.map((r) => String(r.cortes || "—"))}
            crudos={filas.map((r) => r.cortes || null)}
          />
          <FilaComparada
            etiqueta="alcance"
            valores={filas.map((r) => r.alcanceFmt)}
            crudos={filas.map((r) => r.alcance)}
          />
          <FilaComparada etiqueta="eng %" valores={filas.map((r) => r.engRate)} />
          <FilaComparada
            etiqueta="eng"
            valores={filas.map((r) => (r.engagements === null ? "—" : r.engagements.toLocaleString("es-AR")))}
            crudos={filas.map((r) => r.engagements)}
          />
          <FilaComparada etiqueta="save/like" valores={filas.map((r) => r.saveLike)} />
          <FilaComparada
            etiqueta="follows"
            valores={filas.map((r) => r.followsFmt)}
            crudos={filas.map((r) => r.follows)}
          />
          <FilaComparada etiqueta="veredicto" valores={filas.map((r) => r.verdict || "—")} />
          {/* La campaña al final: dos piezas de la misma tanda se comparan por
              contenido; de tandas distintas, la diferencia empieza por acá. */}
          <FilaComparada
            etiqueta="campaña"
            valores={filas.map((r) => r.carpeta.split("/").pop() || "—")}
          />
        </tbody>
      </table>
    </div>
  );
}

/** El comparador de campañas. Los mismos datos, sumados por carpeta. */
function CompararCampanas({ campanas }: { campanas: Campana[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse">
        <thead>
          <tr>
            <th />
            {campanas.map((c) => (
              <th key={c.carpeta} className="pb-2 pr-4 text-left align-bottom">
                <span className="block max-w-[14rem] text-[13px] font-medium">{c.nombre}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  {c.canales.join(", ") || "—"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <FilaComparada
            etiqueta="piezas"
            valores={campanas.map((c) => String(c.filas.length))}
            crudos={campanas.map((c) => c.filas.length)}
          />
          {/* Cuántas de cuántas, y NUNCA el alcance solo: una campaña con una de
              seis piezas medida y otra con las seis no se comparan por el total. */}
          <FilaComparada
            etiqueta="medidas"
            valores={campanas.map((c) => `${c.medidas} de ${c.filas.length}`)}
          />
          <FilaComparada
            etiqueta="alcance"
            valores={campanas.map((c) => (c.medidas ? c.alcance.toLocaleString("es-AR") : "—"))}
            crudos={campanas.map((c) => (c.medidas ? c.alcance : null))}
          />
          {/* Por pieza MEDIDA, no por pieza: dividir por las seis cuando se
              midió una dice que le fue seis veces peor de lo que le fue. */}
          <FilaComparada
            etiqueta="por medida"
            valores={campanas.map((c) => (c.medidas ? Math.round(c.alcance / c.medidas).toLocaleString("es-AR") : "—"))}
            crudos={campanas.map((c) => (c.medidas ? Math.round(c.alcance / c.medidas) : null))}
          />
          <FilaComparada etiqueta="desde" valores={campanas.map((c) => c.desde || "—")} />
          <FilaComparada etiqueta="hasta" valores={campanas.map((c) => c.hasta || "—")} />
        </tbody>
      </table>
    </div>
  );
}

/**
 * La barra que aparece al elegir algo, y el drawer que abre.
 *
 * Fija abajo: el botón tiene que estar donde está la mano después de tildar la
 * cuarta casilla, no arriba de todo obligando a volver a subir.
 *
 * Las llaves elegidas se resuelven ACÁ contra lo que está a la vista, y el store
 * no guarda la fila entera: si un filtro saca una pieza de la lista, su llave
 * sigue elegida pero ya no hay qué dibujar. Se deja afuera y el conteo lo dice,
 * en vez de abrir una columna con datos que la vista ya no muestra.
 */
function BarraComparar({ filas, campanas }: { filas: InventarioRow[]; campanas: Campana[] }) {
  const d = useAppDispatch();
  const sel = useAppSelector((e) => e.seleccion);

  const elegidas = useMemo(() => {
    if (sel.modo === "campanas") {
      const m = new Map(campanas.map((c) => [c.carpeta, c]));
      return sel.llaves.map((k) => m.get(k)).filter((c): c is Campana => Boolean(c));
    }
    const m = new Map(filas.map((r) => [r.llave, r]));
    return sel.llaves.map((k) => m.get(k)).filter((r): r is InventarioRow => Boolean(r));
  }, [sel.modo, sel.llaves, filas, campanas]);

  if (sel.llaves.length === 0) return null;

  const n = sel.llaves.length;
  const que =
    sel.modo === "campanas" ? (n === 1 ? "campaña" : "campañas") : n === 1 ? "pieza" : "piezas";
  const fuera = n - elegidas.length;

  return (
    <>
      <div className="sticky bottom-3 z-30 mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
        <span className="text-[13px] tabular-nums">
          {n} {que}
          {/* Las que un filtro dejó fuera de la lista se dicen: si no, el botón
              abriría tres columnas habiendo tildado cuatro, sin explicación. */}
          {fuera > 0 && (
            <span className="ml-1 text-[11px] text-muted-foreground">({fuera} fuera del filtro)</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => d(abrir(true))}
          disabled={elegidas.length < 2}
          title={elegidas.length < 2 ? "Elegí al menos dos" : undefined}
          className="rounded-full bg-primary px-3 py-1 text-[13px] font-medium text-primary-foreground disabled:opacity-40"
        >
          Comparar
        </button>
        <button
          type="button"
          onClick={() => d(limpiar())}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          Limpiar
        </button>
      </div>

      <Drawer
        abierto={sel.abierto}
        onAbierto={(v) => d(abrir(v))}
        titulo={`Comparando ${elegidas.length} ${que}`}
        detalle="El máximo de cada fila se marca solo entre las que tienen número: una sin medir no pierde, todavía no compite."
      >
        {sel.modo === "campanas" ? (
          <CompararCampanas campanas={elegidas as Campana[]} />
        ) : (
          <CompararPiezas filas={elegidas as InventarioRow[]} />
        )}
      </Drawer>
    </>
  );
}

export default function InventarioClient({
  rows,
  creativos = [],
  umbrales = {},
}: {
  rows: InventarioRow[];
  creativos?: InventarioRow[];
  umbrales?: Umbrales;
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);
  const [materia, setMateria] = useState<Materia>("organico");
  const [vista, setVista] = useState<Vista>("tabla");
  const [agrupar, setAgrupar] = useState<Agrupacion>("coverage");
  const fav = useFavoritos();
  const { favoritos, alternar, quienes, error: errorFavoritos } = fav;

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

  const campanas = useMemo(() => porCampana(filas), [filas]);

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

      {errorFavoritos && (
        <p className="mb-3 rounded-md border border-[var(--tg-red)]/30 bg-[var(--tg-red)]/5 px-3 py-2 text-[12px] leading-relaxed">
          {errorFavoritos}
        </p>
      )}

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
          {/* Las piezas de una misma carpeta son una tanda: se planearon y se
              publicaron juntas. Colapsadas, porque lo que se mira primero es
              qué campañas hay — no las 126 piezas de corrido. */}
          <ToggleGroupItem value="campanas" aria-label="Vista por campaña">Campañas</ToggleGroupItem>
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
            <CabeceraInventario esAds={esAds} />
            <TableBody>
              {filas.map((r) => (
                <FilaInventario key={r.llave} r={r} esAds={esAds} fav={fav} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : vista === "campanas" ? (
        <div className="space-y-2">
          {campanas.map((c) => (
            <Desplegable
              key={c.carpeta}
              titulo={
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span>{c.nombre}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {c.filas.length} {c.filas.length === 1 ? "pieza" : "piezas"}
                    {c.canales.length > 0 && ` · ${c.canales.join(", ")}`}
                  </span>
                </span>
              }
              acciones={<Casilla llave={c.carpeta} modo="campanas" />}
              detalle={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {/* Cuántas de cuántas están medidas va SIEMPRE al lado del
                      alcance: sin eso, "1.2k" parece el alcance de la campaña
                      cuando puede ser el de una sola de sus seis piezas. */}
                  <span>
                    {c.medidas} de {c.filas.length} medidas
                  </span>
                  {c.medidas > 0 && <span className="tabular-nums">{c.alcance.toLocaleString("es-AR")} de alcance</span>}
                  {c.desde && (
                    <span className="tabular-nums">
                      {c.desde === c.hasta ? c.desde : `${c.desde} → ${c.hasta}`}
                    </span>
                  )}
                </span>
              }
            >
              <div className="-mx-5 -my-4 overflow-hidden">
                <Table>
                  <CabeceraInventario esAds={esAds} />
                  <TableBody>
                    {c.filas.map((r) => (
                      <FilaInventario key={r.llave} r={r} esAds={esAds} fav={fav} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Desplegable>
          ))}
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
                  <Estrella on={favoritos.has(r.llave)} otros={quienes.get(r.llave)} onClick={() => alternar(r.llave)} />
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
                      <Estrella on={favoritos.has(r.llave)} otros={quienes.get(r.llave)} onClick={() => alternar(r.llave)} />
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

      <BarraComparar filas={filas} campanas={campanas} />
    </>
  );
}
