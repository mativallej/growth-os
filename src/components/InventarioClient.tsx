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
  cambiarAmbito,
  limpiar,
  MAXIMO,
  PIEZAS,
  type Ambito,
} from "@/store/seleccion";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { RedIcono } from "@/components/RedIcono";
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
  hermanas = [],
}: {
  r: InventarioRow;
  esAds: boolean;
  fav: Favoritos;
  /**
   * Las OTRAS piezas de su carpeta. Salen del universo sin filtrar a propósito:
   * la campaña es un hecho del vault, no del filtro puesto. Si estás mirando
   * solo X y una pieza tiene dos reels hermanos, verlos es justamente el dato.
   */
  hermanas?: InventarioRow[];
}) {
  const cob = COBERTURA[r.coverage] ?? COBERTURA.untracked;
  const [abierto, setAbierto] = useState(false);
  const hayHermanas = hermanas.length > 0;

  return (
    <>
    <TableRow>
      <TableCell className="max-w-0">
        {/* LAS ACCIONES NO VAN ACÁ. Estuvieron —casilla, estrella y título en la
            misma celda— y era la celda más cargada de la tabla: tres controles
            distintos pegados al texto que hay que leer. Ahora la columna del
            título tiene el título, y las dos acciones viven a la derecha, cada
            una en su columna, donde el ojo ya sabe que hay botones. */}
        <div className="flex items-center gap-1.5">
          {/* El desplegable de la PIEZA: con qué se publicó junto. Solo aparece
              si hay con qué — una pieza sola en su carpeta no tiene campaña. */}
          {hayHermanas ? (
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              title={`${hermanas.length + 1} piezas en esta campaña`}
              className="shrink-0 text-muted-foreground/60 hover:text-foreground"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3 transition-transform", abierto && "rotate-90")}>
                <path d="M4.5 2 8.5 6 4.5 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            // El hueco se reserva igual: sin esto los títulos de las piezas sin
            // campaña arrancan tres píxeles a la izquierda y la columna baila.
            <span aria-hidden="true" className="size-3 shrink-0" />
          )}
          <Link href={r.href} className="min-w-0 flex-1 truncate text-[13px] hover:underline">
            {r.title}
          </Link>
          <Enlaces url={r.url} driveUrl={r.driveUrl} />
        </div>
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
          <TableCell className="hidden sm:table-cell">
            <RedIcono canal={r.canal} />
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
        </>
      )}

      {/* LA CUENTA DE CORTES SE FUE de esta tabla. Un `4` suelto no dice nada
          que se pueda usar desde acá: para saber qué midieron hay que abrir la
          pieza, y para comparar dos piezas está el comparador. Sigue estando en
          la vista de métricas y en el desplegable de campaña. */}
      <TableCell className="w-10 text-center">
        <Estrella
          on={fav.favoritos.has(r.llave)}
          otros={fav.quienes.get(r.llave)}
          onClick={() => fav.alternar(r.llave)}
        />
      </TableCell>
      <TableCell className="w-10 text-center">
        <Casilla llave={r.llave} ambito={PIEZAS} />
      </TableCell>
    </TableRow>

    {abierto && (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={esAds ? 8 : 7} className="bg-secondary/40 p-0">
          <Hermanas esta={r} hermanas={hermanas} fav={fav} />
        </TableCell>
      </TableRow>
    )}
    </>
  );
}

/**
 * LAS PIEZAS HERMANAS: con qué se publicó esta.
 *
 * Una carpeta del vault es una campaña. Adentro conviven formatos distintos —un
 * carrusel, dos reels, el tweet que los anunció— y hasta ahora el inventario los
 * mostraba como filas sueltas separadas por veinte renglones de otras campañas.
 *
 * Y LO QUE SE MUESTRA SON LAS MÉTRICAS, una al lado de la otra. La pregunta que
 * esta tabla contesta no es "qué más hay en la carpeta" —eso ya lo dice el
 * nombre— sino CUÁL DE LAS FORMAS FUNCIONÓ. El mismo contenido contado como reel
 * y como carrusel es el único experimento limpio que este vault produce solo: el
 * tema es igual, cambia la forma.
 *
 * El máximo se marca SOLO ENTRE LAS MEDIDAS, por lo mismo que en el comparador:
 * una pieza sin números no perdió, todavía no compite.
 *
 * La pieza desde la que se abrió va resaltada y primera. Sin eso hay que buscar
 * cuál de las cinco filas es la que se estaba mirando.
 */
function Hermanas({
  esta,
  hermanas,
  fav,
}: {
  esta: InventarioRow;
  hermanas: InventarioRow[];
  fav: Favoritos;
}) {
  const todas = [esta, ...hermanas];
  const medidos = todas.map((r) => r.alcance).filter((v): v is number => v !== null);
  const tope = medidos.length > 1 ? Math.max(...medidos) : null;

  return (
    <div className="overflow-x-auto px-3 py-2">
      <div className="pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {/* El nombre de la campaña acá y no solo en la vista agrupada: desde la
            tabla plana, esta es la única pista de por qué estas piezas van juntas. */}
        Campaña: {esta.carpeta.split("/").pop() || "—"} · {todas.length} piezas
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground/70">
            <th className="py-1 pr-3 font-normal">pieza</th>
            <th className="py-1 pr-3 font-normal">red</th>
            <th className="hidden py-1 pr-3 font-normal sm:table-cell">formato</th>
            <th className="hidden py-1 pr-3 font-normal md:table-cell">fecha</th>
            <th className="py-1 pr-3 text-right font-normal">alcance</th>
            <th className="hidden py-1 pr-3 text-right font-normal sm:table-cell">eng %</th>
            <th className="hidden py-1 pr-3 text-right font-normal md:table-cell">save/like</th>
            <th className="py-1 text-right font-normal">cortes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {todas.map((h) => {
            const gana = tope !== null && h.alcance === tope;
            return (
              <tr key={h.llave} className={cn(h.llave === esta.llave && "bg-background/60")}>
                <td className="py-1.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    <Casilla llave={h.llave} ambito={PIEZAS} />
                    <Estrella
                      on={fav.favoritos.has(h.llave)}
                      otros={fav.quienes.get(h.llave)}
                      onClick={() => fav.alternar(h.llave)}
                    />
                    <Link href={h.href} className="truncate hover:underline">
                      {h.title}
                    </Link>
                    <Enlaces url={h.url} driveUrl={h.driveUrl} />
                  </div>
                </td>
                <td className="py-1.5 pr-3"><RedIcono canal={h.canal} /></td>
                <td className="hidden py-1.5 pr-3 text-muted-foreground sm:table-cell">
                  {h.formato || "—"}
                </td>
                <td className="hidden py-1.5 pr-3 tabular-nums text-muted-foreground md:table-cell">
                  {h.publishedAt || "—"}
                </td>
                <td className={cn("py-1.5 pr-3 text-right tabular-nums", gana ? "font-medium" : "text-muted-foreground")}>
                  {h.alcanceFmt}
                  {gana && <span className="ml-1 text-[10px] text-muted-foreground/60">máx</span>}
                </td>
                <td className="hidden py-1.5 pr-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {h.engRate}
                </td>
                <td className="hidden py-1.5 pr-3 text-right tabular-nums text-muted-foreground md:table-cell">
                  {h.saveLike}
                </td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {h.cortes || "—"}
                </td>
              </tr>
            );
          })}
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
        {/* Sin rótulo: la columna del título no necesita que le digan "pieza"
            arriba, y el espacio se lo lleva el título. */}
        <TableHead />
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
            <TableHead className="hidden w-14 sm:table-cell">red</TableHead>
            <TableHead className="hidden w-16 md:table-cell">fórmula</TableHead>
            <TableHead className="hidden w-24 md:table-cell">fecha</TableHead>
            <TableHead className="w-28">cobertura</TableHead>
          </>
        )}
        {/* Los símbolos y no las palabras: dos columnas de 40px con "favorito" y
            "seleccionar" escritos arriba se leen como el título de una sección. */}
        <TableHead className="w-10 text-center" title="Favorito">★</TableHead>
        <TableHead className="w-10 text-center" title="Comparar">☑</TableHead>
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
function Casilla({ llave, ambito }: { llave: string; ambito: Ambito }) {
  const d = useAppDispatch();
  const sel = useAppSelector((e) => e.seleccion);
  const elegida = sel.ambito === ambito && sel.llaves.includes(llave);
  const lleno = sel.ambito === ambito && sel.llaves.length >= MAXIMO && !elegida;

  return (
    <Checkbox
      checked={elegida}
      disabled={lleno}
      onCheckedChange={() => {
        // Cambiar de ámbito vacía lo elegido: dos piezas y una fórmula no se
        // dibujan en columnas comparables.
        if (sel.ambito !== ambito) d(cambiarAmbito(ambito));
        d(alternarSeleccion(llave));
      }}
      // Adentro del `<summary>` de una campaña, un click que burbujea abre y
      // cierra el desplegable. Tildar no es navegar.
      onClick={(e) => e.stopPropagation()}
      aria-label={elegida ? "Sacar de la comparación" : "Agregar a la comparación"}
      title={lleno ? `Hasta ${MAXIMO} a la vez` : "Comparar"}
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

/**
 * UN CONJUNTO DE PIEZAS con nombre: una campaña, una fórmula, una red, una ronda.
 *
 * Son todos lo mismo para comparar —un puñado de piezas que se quieren mirar
 * juntas— así que hay un solo comparador y no seis. La diferencia entre "esta
 * fórmula" y "esta campaña" vive en quién arma la lista, no en cómo se resume.
 */
type Conjunto = { clave: string; nombre: string; filas: InventarioRow[] };

/** Resume un conjunto. Lo que no está medido NO se cuenta como cero. */
function resumir(c: Conjunto) {
  const fechas = c.filas.map((r) => r.publishedAt).filter(Boolean).sort();
  const medidas = c.filas.filter((r) => r.alcance !== null);
  return {
    piezas: c.filas.length,
    medidas: medidas.length,
    alcance: medidas.reduce((t, r) => t + (r.alcance ?? 0), 0),
    desde: fechas[0] ?? "",
    hasta: fechas[fechas.length - 1] ?? "",
    canales: [...new Set(c.filas.map((r) => r.canal))].sort(),
  };
}

/** El comparador de conjuntos: los mismos datos, sumados. */
function CompararConjuntos({ conjuntos }: { conjuntos: Conjunto[] }) {
  const r = conjuntos.map(resumir);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse">
        <thead>
          <tr>
            <th />
            {conjuntos.map((c, i) => (
              <th key={c.clave} className="pb-2 pr-4 text-left align-bottom">
                <span className="block max-w-[14rem] text-[13px] font-medium">{c.nombre}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                  {r[i].canales.map((ca) => (
                    <RedIcono key={ca} canal={ca} />
                  ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <FilaComparada
            etiqueta="piezas"
            valores={r.map((x) => String(x.piezas))}
            crudos={r.map((x) => x.piezas)}
          />
          {/* Cuántas de cuántas, y NUNCA el alcance solo: un conjunto con una de
              seis piezas medida y otro con las seis no se comparan por el total. */}
          <FilaComparada etiqueta="medidas" valores={r.map((x) => `${x.medidas} de ${x.piezas}`)} />
          <FilaComparada
            etiqueta="alcance"
            valores={r.map((x) => (x.medidas ? x.alcance.toLocaleString("es-AR") : "—"))}
            crudos={r.map((x) => (x.medidas ? x.alcance : null))}
          />
          {/* Por pieza MEDIDA, no por pieza: dividir por las seis cuando se midió
              una dice que le fue seis veces peor de lo que le fue. */}
          <FilaComparada
            etiqueta="por medida"
            valores={r.map((x) => (x.medidas ? Math.round(x.alcance / x.medidas).toLocaleString("es-AR") : "—"))}
            crudos={r.map((x) => (x.medidas ? Math.round(x.alcance / x.medidas) : null))}
          />
          <FilaComparada etiqueta="desde" valores={r.map((x) => x.desde || "—")} />
          <FilaComparada etiqueta="hasta" valores={r.map((x) => x.hasta || "—")} />
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
function BarraComparar({
  filas,
  campanas,
  grupos,
  etiquetaGrupo,
}: {
  filas: InventarioRow[];
  campanas: Campana[];
  /** Los grupos de la vista de tablero: fórmula, red, persona, ronda… */
  grupos: { clave: string; label: string; filas: InventarioRow[] }[];
  /** Cómo se llama en singular lo que agrupa hoy el tablero. */
  etiquetaGrupo: string;
}) {
  const d = useAppDispatch();
  const sel = useAppSelector((e) => e.seleccion);

  const elegidas = useMemo(() => {
    // Una campaña, una fórmula y una red son lo mismo para esto: un conjunto de
    // piezas con un nombre. Se normalizan a la misma forma y el comparador de
    // grupos no sabe de cuál vino.
    if (sel.ambito === "campana") {
      const m = new Map(campanas.map((c) => [c.carpeta, { clave: c.carpeta, nombre: c.nombre, filas: c.filas }]));
      return sel.llaves.map((k) => m.get(k)).filter(Boolean) as Conjunto[];
    }
    if (sel.ambito !== PIEZAS) {
      const m = new Map(grupos.map((g) => [g.clave, { clave: g.clave, nombre: g.label, filas: g.filas }]));
      return sel.llaves.map((k) => m.get(k)).filter(Boolean) as Conjunto[];
    }
    const m = new Map(filas.map((r) => [r.llave, r]));
    return sel.llaves.map((k) => m.get(k)).filter((r): r is InventarioRow => Boolean(r));
  }, [sel.ambito, sel.llaves, filas, campanas, grupos]);

  if (sel.llaves.length === 0) return null;

  const n = sel.llaves.length;
  const singular =
    sel.ambito === PIEZAS ? "pieza" : sel.ambito === "campana" ? "campaña" : etiquetaGrupo;
  const que = n === 1 ? singular : `${singular}s`;
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
        {sel.ambito === PIEZAS ? (
          <CompararPiezas filas={elegidas as InventarioRow[]} />
        ) : (
          <CompararConjuntos conjuntos={elegidas as Conjunto[]} />
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
              acciones={<Casilla llave={c.carpeta} ambito="campana" />}
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
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Casilla llave={r.llave} ambito={PIEZAS} />
                  <Estrella on={favoritos.has(r.llave)} otros={quienes.get(r.llave)} onClick={() => alternar(r.llave)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link href={r.href} className="min-w-0 truncate text-[13px] font-medium hover:underline">
                        {r.title}
                      </Link>
                      <Enlaces url={r.url} driveUrl={r.driveUrl} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <RedIcono canal={r.canal} />
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
              <header className="mb-2 flex items-center justify-between gap-2 px-1">
                <h3 className="truncate text-[13px] font-medium">{col.label}</h3>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-[11px] text-muted-foreground">
                    {col.filas.length}
                  </span>
                  {/* La columna entera se compara como un conjunto: dos fórmulas,
                      dos redes, dos rondas. El ámbito es la dimensión que agrupa
                      hoy, así que agregar una a AGRUPACIONES la hace comparable
                      sin tocar nada más. */}
                  <Casilla llave={col.clave} ambito={agrupar} />
                </div>
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
                      <Casilla llave={r.llave} ambito={PIEZAS} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                      <RedIcono canal={r.canal} />
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

      <BarraComparar
        filas={filas}
        campanas={campanas}
        grupos={columnas}
        etiquetaGrupo={(AGRUPACIONES.find((a) => a.value === agrupar)?.label ?? "grupo").toLowerCase()}
      />
    </>
  );
}
