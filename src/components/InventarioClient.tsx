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
import { facetas, type Materia, type Unidad } from "@/lib/unidades";

/**
 * El inventario: TODAS las piezas, incluidas las que no tienen footer ni
 * métricas. Esconder las no medidas es lo que hacía que el agujero real —el
 * canal casi vacío— no se viera.
 *
 * DOS VISTAS, y la de tablero NO duplica el kanban de coordinación.
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
  { value: "reciente", label: "Más reciente" },
  { value: "antigua", label: "Más antigua" },
  { value: "titulo", label: "Título" },
  { value: "cortes", label: "Más medida" },
];

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
}: {
  rows: InventarioRow[];
  creativos?: InventarioRow[];
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);
  const [materia, setMateria] = useState<Materia>("organico");
  const [vista, setVista] = useState<"tabla" | "tablero">("tabla");
  const [agrupar, setAgrupar] = useState<Agrupacion>("coverage");

  const esAds = materia === "ads";
  const universo = esAds ? creativos : rows;
  // Las facetas salen del conjunto ACTIVO: con ads no tiene sentido ofrecer
  // fórmulas, y con orgánico no tiene sentido ofrecer personas.
  const canales = facetas(universo, "canal");
  const formulas = esAds ? [] : facetas(universo, "formulaCode");
  const personas = esAds ? facetas(universo, "persona") : [];
  const angulos = esAds ? facetas(universo, "angulo") : [];
  const rondas = esAds ? facetas(universo, "ronda") : [];

  const filas = useMemo(() => {
    const out = aplicarFiltros(universo, f);
    const porFecha = (a: InventarioRow, b: InventarioRow) =>
      (b.publishedAt || "").localeCompare(a.publishedAt || "");
    switch (f.orden) {
      case "reciente":
        return [...out].sort(porFecha);
      case "antigua":
        return [...out].sort((a, b) => -porFecha(a, b));
      case "titulo":
        return [...out].sort((a, b) => a.title.localeCompare(b.title));
      case "cortes":
        return [...out].sort((a, b) => b.cortes - a.cortes);
      default:
        return out;
    }
  }, [universo, f]);

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
          if (m === "ads") setAgrupar("persona");
          else setAgrupar("coverage");
        }}
        conteos={{ organico: rows.length, ads: creativos.length }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={vista}
          onValueChange={(v) => v && setVista(v as "tabla" | "tablero")}
        >
          <ToggleGroupItem value="tabla" aria-label="Vista de tabla">Tabla</ToggleGroupItem>
          <ToggleGroupItem value="tablero" aria-label="Vista de tablero">Tablero</ToggleGroupItem>
        </ToggleGroup>

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
        resultados={filas.length}
        total={universo.length}
      />

      {filas.length === 0 ? (
        <div className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
          Ninguna pieza pasa estos filtros.
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
                  <TableRow key={r.href}>
                    <TableCell className="max-w-0">
                      <Link href={r.href} className="block truncate text-[13px] hover:underline">
                        {r.title}
                      </Link>
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
                  <Link
                    key={r.href}
                    href={r.href}
                    className="rounded-md border border-border bg-background px-2.5 py-2 transition-colors hover:bg-secondary"
                  >
                    <div className="line-clamp-2 text-[13px] leading-snug">{r.title}</div>
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
                  </Link>
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
