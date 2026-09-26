"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Filtros, {
  aplicarFiltros,
  FILTROS_VACIOS,
  type EstadoFiltros,
  type Opcion,
} from "@/components/Filtros";

/**
 * Las piezas medidas, en filas densas.
 *
 * Eran tarjetas de media pantalla cada una, con un gráfico de 720×190 que con un
 * solo corte dibujaba una caja vacía con un puntito. Se comparaban de a una,
 * cuando el sentido de esta vista es comparar muchas: ahora la fila es la
 * unidad, el sparkline aparece SOLO si hay serie que mostrar, y lo que ocupa
 * lugar son los números.
 */

export type PiezaCard = {
  title: string;
  href: string;
  canal: string;
  cuenta: string;
  formula: string;
  formulaCode: string;
  coverage: string;
  publishedAt: string;
  verdict: string;
  /** Sparkline ya renderizado en el servidor. `null` con menos de dos cortes. */
  sparkHtml: string | null;
  cortes: number;
  alcance: number | null;
  alcanceFmt: string;
  engRate: string;
  saveLike: string;
  follows: string;
  search: string;
};

const ORDENES: Opcion[] = [
  { value: "alcance", label: "Más alcance" },
  { value: "alcance-asc", label: "Menos alcance" },
  { value: "reciente", label: "Más reciente" },
  { value: "antigua", label: "Más antigua" },
  { value: "titulo", label: "Título" },
];

const variantePorVeredicto = (v: string): "success" | "destructive" | "secondary" => {
  const s = v.toLowerCase();
  if (["breakout", "strong", "solid"].includes(s)) return "success";
  if (["weak", "flop"].includes(s)) return "destructive";
  return "secondary";
};

export default function PiezasClient({
  cards,
  canales,
  formulas,
}: {
  cards: PiezaCard[];
  canales: Opcion[];
  formulas: Opcion[];
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);

  const filas = useMemo(() => {
    const out = aplicarFiltros(cards, f);
    const porFecha = (a: PiezaCard, b: PiezaCard) =>
      (b.publishedAt || "").localeCompare(a.publishedAt || "");
    switch (f.orden) {
      case "alcance-asc":
        return [...out].sort((a, b) => (a.alcance ?? 0) - (b.alcance ?? 0));
      case "reciente":
        return [...out].sort(porFecha);
      case "antigua":
        return [...out].sort((a, b) => -porFecha(a, b));
      case "titulo":
        return [...out].sort((a, b) => a.title.localeCompare(b.title));
      default:
        return [...out].sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0));
    }
  }, [cards, f]);

  // Si NINGUNA fila tiene serie, la columna entera sobra: con un solo corte por
  // pieza, repetir "1 corte" en 72 filas es ruido que no dice nada nuevo. La
  // cantidad de cortes ya vive en el title de la fila.
  const haySeries = filas.some((c) => c.sparkHtml);

  return (
    <>
      <Filtros
        estado={f}
        onChange={setF}
        canales={canales}
        formulas={formulas}
        ordenes={ORDENES}
        conCobertura={false}
        resultados={filas.length}
        total={cards.length}
      />

      {cards.length === 0 ? (
        <div className="rounded-lg border border-border p-5">
          <p className="text-sm">Ninguna pieza tiene métricas cargadas todavía.</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Las piezas publicadas sin números están en <strong>Deuda</strong>, que es
            donde se ve hace cuánto están esperando.
          </p>
        </div>
      ) : filas.length === 0 ? (
        <div className="rounded-lg border border-border p-5 text-sm text-muted-foreground">
          Ninguna pieza pasa estos filtros.
        </div>
      ) : (
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
            {filas.map((c) => (
              <div key={c.href} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <Link href={c.href} className="block truncate text-[13px] font-medium hover:underline">
                    {c.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{c.canal}</span>
                    {c.formulaCode && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono" title={c.formula}>{c.formulaCode}</span>
                      </>
                    )}
                    {c.publishedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{c.publishedAt}</span>
                      </>
                    )}
                    {c.verdict && (
                      <Badge variant={variantePorVeredicto(c.verdict)} className="ml-0.5">
                        {c.verdict}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* El sparkline solo existe con dos cortes o más: una serie de un
                    punto no es una serie. La celda queda vacía en vez de repetir
                    "1 corte" en cada fila. */}
                {haySeries && (
                  <div className="w-[108px] shrink-0" title={`${c.cortes} corte(s) medidos`}>
                    {c.sparkHtml ? (
                      <span dangerouslySetInnerHTML={{ __html: c.sparkHtml }} />
                    ) : (
                      <span aria-hidden="true" className="text-muted-foreground/25">—</span>
                    )}
                  </div>
                )}

                <span className="w-20 shrink-0 text-right text-[13px] font-medium tabular-nums">
                  {c.alcanceFmt}
                </span>
                <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                  {c.engRate}
                </span>
                <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-[var(--tg-green)]">
                  {c.saveLike}
                </span>
                <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-[var(--tg-green)]">
                  {c.follows}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
