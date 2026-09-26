"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * El uso del catálogo de fórmulas.
 *
 * Era dos tarjetas: una lista de badges con las sin estrenar y un gráfico de
 * barras con las usadas. Se leía de un vistazo y no se podía hacer nada con eso
 * — no había forma de ordenar por rendimiento, de mirar un canal solo, ni de
 * llegar a las piezas de una fórmula sin ir a buscarlas a mano.
 *
 * Ahora cada fórmula es una fila que se abre. Lo que estaba en la tarjeta de
 * "sin estrenar" es un ESTADO de la fila y un filtro, que es donde sirve: se
 * puede pedir "las sin estrenar de Instagram" en vez de leer una lista entera.
 *
 * LA COLUMNA QUE LA HACE ACCIONABLE ES EL ALCANCE MEDIANO. Contar piezas dice
 * cuánto se usó una fórmula; el alcance dice si valió la pena. Es la MEDIANA y no
 * el promedio: con una pieza de 178.768 y tres de 2.000, el promedio dice 46.000
 * y ninguna pieza se parece a eso.
 */

export type PiezaDeFormula = {
  slug: string;
  title: string;
  href: string;
  canal: string;
  publishedAt: string;
  estado: string;
  cobertura: string;
  alcance: number | null;
  alcanceFmt: string;
  medida: boolean;
};

export type FilaFormula = {
  code: string;
  name: string;
  /** Canal del catálogo. `unknown` = el código se usa pero el catálogo no lo declara. */
  channel: string;
  estado: "usada" | "sin-estrenar" | "fuera-de-catalogo";
  piezas: PiezaDeFormula[];
  medidas: number;
  /** Mediana del alcance de sus piezas medidas. `null` si ninguna se midió. */
  mediana: number | null;
  medianaFmt: string;
};

const ESTADOS: Opcion[] = [
  { value: "usada", label: "Usadas" },
  { value: "sin-estrenar", label: "Sin estrenar" },
  { value: "fuera-de-catalogo", label: "Fuera del catálogo" },
];

const ORDENES: Opcion[] = [
  { value: "piezas", label: "Más usadas" },
  { value: "alcance", label: "Más alcance (mediana)" },
  { value: "medidas", label: "Más medidas" },
  { value: "codigo", label: "Por código" },
];

const ETIQUETA_ESTADO: Record<FilaFormula["estado"], { label: string; variant: "success" | "secondary" | "outline" }> = {
  usada: { label: "usada", variant: "success" },
  "sin-estrenar": { label: "sin estrenar", variant: "outline" },
  "fuera-de-catalogo": { label: "fuera del catálogo", variant: "secondary" },
};

export default function FormulasClient({ filas }: { filas: FilaFormula[] }) {
  const [q, setQ] = useState("");
  const [canales, setCanales] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [orden, setOrden] = useState("piezas");
  const [abierta, setAbierta] = useState<string | null>(null);

  const sucio = Boolean(q) || canales.length > 0 || estados.length > 0 || orden !== "piezas";

  const opcionesCanal: Opcion[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filas) m.set(f.channel, (m.get(f.channel) ?? 0) + 1);
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({
        value,
        label: value === "unknown" ? "sin canal" : value,
        count,
      }));
  }, [filas]);

  const visibles = useMemo(() => {
    const texto = q.trim().toLowerCase();
    const cs = new Set(canales);
    const es = new Set(estados);
    const out = filas.filter((f) => {
      if (texto && !`${f.code} ${f.name}`.toLowerCase().includes(texto)) return false;
      if (cs.size && !cs.has(f.channel)) return false;
      if (es.size && !es.has(f.estado)) return false;
      return true;
    });
    switch (orden) {
      case "alcance":
        // Las sin medir al final: `null` no es "menos alcance", es que nadie lo midió.
        return [...out].sort((a, b) => (b.mediana ?? -1) - (a.mediana ?? -1));
      case "medidas":
        return [...out].sort((a, b) => b.medidas - a.medidas);
      case "codigo":
        return [...out].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
      default:
        return [...out].sort((a, b) => b.piezas.length - a.piezas.length);
    }
  }, [filas, q, canales, estados, orden]);


  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar fórmula…"
          className="h-8 w-full text-xs sm:w-52"
          aria-label="Buscar fórmula"
        />
        <MultiSelect titulo="Canal" opciones={opcionesCanal} valor={canales} onChange={setCanales} />
        <MultiSelect titulo="Estado" opciones={ESTADOS} valor={estados} onChange={setEstados} />
        <Select value={orden} onValueChange={setOrden}>
          <SelectTrigger className="w-[12rem]" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDENES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sucio && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setCanales([]);
              setEstados([]);
              setOrden("piezas");
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="hidden items-center gap-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground/70 sm:flex">
          <span className="w-12 shrink-0">cód.</span>
          <span className="flex-1">fórmula</span>
          <span className="w-16 shrink-0 text-right">piezas</span>
          <span className="w-16 shrink-0 text-right">medidas</span>
          <span className="w-20 shrink-0 text-right">alcance</span>
        </div>

        <div className="divide-y divide-border">
          {visibles.map((f) => {
            const abierto = abierta === f.code;
            const et = ETIQUETA_ESTADO[f.estado];
            return (
              <div key={f.code}>
                <button
                  type="button"
                  onClick={() => setAbierta(abierto ? null : f.code)}
                  aria-expanded={abierto}
                  disabled={f.piezas.length === 0}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent sm:flex-nowrap"
                >
                  <span className="w-12 shrink-0 font-mono text-[13px]">{f.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{f.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant={et.variant}>{et.label}</Badge>
                      {f.channel !== "unknown" && (
                        <span className="text-[11px] text-muted-foreground">{f.channel}</span>
                      )}
                    </span>
                  </span>
                  <span className="w-16 shrink-0 text-right text-[13px] font-medium tabular-nums">
                    {f.piezas.length || "—"}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                    {f.medidas || "—"}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[13px] tabular-nums">
                    {f.medianaFmt}
                  </span>
                </button>

                {abierto && (
                  <div className="overflow-x-auto border-t border-border bg-muted/20 px-3 py-2">
                    {/* UNA TABLA Y NO UNA LISTA: la pregunta al abrir una fórmula
                        es "cuáles son y cómo les fue", y eso necesita columnas —
                        con los títulos sueltos hay que abrir una por una para
                        saber de qué red es cada una o si está medida. */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>pieza</TableHead>
                          <TableHead className="w-24">red</TableHead>
                          <TableHead className="w-24">fecha</TableHead>
                          <TableHead className="w-28">estado</TableHead>
                          <TableHead className="w-24 text-right">alcance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {f.piezas.map((p) => (
                          <TableRow key={p.slug}>
                            <TableCell className="max-w-0">
                              <Link href={p.href} className="block truncate text-[12px] hover:underline">
                                {p.title}
                              </Link>
                            </TableCell>
                            <TableCell className="text-[12px] text-muted-foreground">
                              {p.canal}
                            </TableCell>
                            <TableCell className="tabular-nums text-[12px] text-muted-foreground">
                              {p.publishedAt || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.medida ? "success" : "outline"}>
                                {p.medida ? "medida" : p.cobertura}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums text-[12px] ${
                                p.medida ? "font-medium" : "text-muted-foreground/40"
                              }`}
                            >
                              {p.alcanceFmt}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {visibles.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            Ninguna fórmula pasa estos filtros.
          </p>
        )}
      </div>
    </>
  );
}
