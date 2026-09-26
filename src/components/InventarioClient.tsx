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
import Filtros, {
  aplicarFiltros,
  FILTROS_VACIOS,
  type EstadoFiltros,
  type Opcion,
} from "@/components/Filtros";

/**
 * El inventario: TODAS las piezas, incluidas las que no tienen footer ni
 * métricas. Esconder las no medidas es lo que hacía que el agujero real —el
 * canal casi vacío— no se viera.
 *
 * Por eso acá el filtro de cobertura importa más que en Piezas: es cómo se pasa
 * de "295 archivos" a "estas 42 están publicadas y sin medir".
 */

export type InventarioRow = {
  title: string;
  href: string;
  canal: string;
  formula: string;
  formulaCode: string;
  estado: string;
  status: string;
  coverage: string;
  publishedAt: string;
  cortes: number;
  search: string;
};

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

export default function InventarioClient({
  rows,
  canales,
  formulas,
}: {
  rows: InventarioRow[];
  canales: Opcion[];
  formulas: Opcion[];
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);

  const filas = useMemo(() => {
    const out = aplicarFiltros(rows, f);
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
  }, [rows, f]);

  return (
    <>
      <Filtros
        estado={f}
        onChange={setF}
        canales={canales}
        formulas={formulas}
        ordenes={ORDENES}
        resultados={filas.length}
        total={rows.length}
      />

      {filas.length === 0 ? (
        <div className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
          Ninguna pieza pasa estos filtros.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>pieza</TableHead>
                <TableHead className="hidden w-24 sm:table-cell">red</TableHead>
                <TableHead className="hidden w-16 md:table-cell">fórmula</TableHead>
                <TableHead className="hidden w-24 md:table-cell">fecha</TableHead>
                <TableHead className="w-28">cobertura</TableHead>
                <TableHead className="w-12 text-right">cortes</TableHead>
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
                      {/* Cero cortes se escribe como raya: no se midió cero, no se midió. */}
                      {r.cortes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
