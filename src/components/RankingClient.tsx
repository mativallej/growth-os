"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Filtros, {
  aplicarFiltros,
  FILTROS_VACIOS,
  type EstadoFiltros,
  type Opcion,
} from "@/components/Filtros";
import MateriaToggle from "@/components/MateriaToggle";
import type { Materia } from "@/lib/unidades";

/**
 * El ranking, sobre datos YA CALCULADOS en el servidor.
 *
 * Todo el filtrado y el orden viven en el cliente: leer la métrica de la query
 * string volvería dinámica la página, y que estas páginas sean estáticas es lo
 * que sostiene el aislamiento entre marcas.
 *
 * Cada pieza viaja con sus cinco métricas y su alcance, que son unos pocos
 * números. Su `body` no viaja.
 */

export type RankFila = {
  title: string;
  href: string;
  canal: string;
  formulaCode: string;
  coverage: string;
  publishedAt: string;
  search: string;
  alcance: number | null;
  engagements: number | null;
  bookmarks: number | null;
  likes: number | null;
  follows: number | null;
};

export type Metrica = "alcance" | "engagements" | "bookmarks" | "likes" | "follows";

const METRICAS: { id: Metrica; label: string }[] = [
  { id: "alcance", label: "Alcance" },
  { id: "engagements", label: "Engagements" },
  { id: "bookmarks", label: "Guardados" },
  { id: "likes", label: "Likes" },
  { id: "follows", label: "Follows" },
];

const ORDENES: Opcion[] = [
  { value: "abs-desc", label: "Más, en absoluto" },
  { value: "abs-asc", label: "Menos, en absoluto" },
  { value: "tasa-desc", label: "Más, en tasa" },
  { value: "tasa-asc", label: "Menos, en tasa" },
  { value: "reciente", label: "Más reciente" },
];

const num = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-AR"));
const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export default function RankingClient({
  filas,
  canales,
  formulas,
  creativos = 0,
  hrefCampanas,
}: {
  filas: RankFila[];
  canales: Opcion[];
  formulas: Opcion[];
  creativos?: number;
  hrefCampanas?: string;
}) {
  const [f, setF] = useState<EstadoFiltros>(FILTROS_VACIOS);
  const [materia, setMateria] = useState<Materia>("organico");
  const [metrica, setMetrica] = useState<Metrica>("alcance");

  const ordenadas = useMemo(() => {
    const base = aplicarFiltros(filas, f)
      .map((r) => {
        const valor = r[metrica];
        // La tasa sobre el alcance es `null` si falta cualquiera de los dos:
        // dividir por un alcance que no se midió daría un número inventado.
        const tasa =
          metrica === "alcance" || valor == null || r.alcance == null || r.alcance === 0
            ? null
            : valor / r.alcance;
        return { ...r, valor, tasa };
      })
      // Una pieza sin la métrica medida NO entra con un cero: un cero es una
      // posición en el ranking y "no medido" no lo es.
      .filter((r) => r.valor != null);

    const cmp = (a: number | null, b: number | null, desc: boolean) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1; // lo no medido va al final en los dos sentidos
      if (b == null) return -1;
      return desc ? b - a : a - b;
    };

    switch (f.orden) {
      case "abs-asc":
        return base.sort((a, b) => cmp(a.valor, b.valor, false));
      case "tasa-desc":
        return base.sort((a, b) => cmp(a.tasa, b.tasa, true));
      case "tasa-asc":
        return base.sort((a, b) => cmp(a.tasa, b.tasa, false));
      case "reciente":
        return base.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
      default:
        return base.sort((a, b) => cmp(a.valor, b.valor, true));
    }
  }, [filas, f, metrica]);

  const etiqueta = METRICAS.find((m) => m.id === metrica)!.label;

  if (materia === "ads") {
    return (
      <>
        <MateriaToggle valor={materia} onChange={setMateria} conteos={{ organico: filas.length, ads: creativos }} />
        <div className="rounded-lg border border-border p-5">
          <p className="text-sm">No hay ranking de creativos, y no es que falte: es otra cosa.</p>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
            Un creativo no se rankea por alcance — rankearlo por alcance es rankearlo
            por cuánto se gastó. Las métricas que lo ordenan son hook-rate, CTR y costo
            por resultado, y las tres son derivadas que el contrato no escribe. Además,
            al día de hoy los {creativos} son briefs sin un solo número. Lo que sí se
            puede mirar es la{" "}
            {hrefCampanas ? (
              <Link href={hrefCampanas} className="text-primary hover:underline">cobertura de campañas</Link>
            ) : ("cobertura de campañas")}.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <MateriaToggle valor={materia} onChange={setMateria} conteos={{ organico: filas.length, ads: creativos }} />
      <div className="mb-3">
        <ToggleGroup
          type="single"
          value={metrica}
          onValueChange={(v) => v && setMetrica(v as Metrica)}
        >
          {METRICAS.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id} aria-label={`Rankear por ${m.label}`}>
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Filtros
        estado={f}
        onChange={setF}
        canales={canales}
        formulas={formulas}
        ordenes={ORDENES}
        conCobertura={false}
        resultados={ordenadas.length}
        total={filas.length}
      />

      {ordenadas.length === 0 ? (
        <div className="rounded-lg border border-border p-5 text-[13px] text-muted-foreground">
          Ninguna pieza tiene <strong>{etiqueta.toLowerCase()}</strong> medido entre las que
          pasan estos filtros. No se listan en cero: un cero es una posición y
          &ldquo;no medido&rdquo; no lo es.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-baseline gap-3 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground/70">
            <span className="w-6 shrink-0" />
            <span className="flex-1">pieza</span>
            <span className="w-20 shrink-0 text-right">{etiqueta.toLowerCase()}</span>
            <span className="hidden w-20 shrink-0 text-right sm:block">/ alcance</span>
          </div>
          <div className="divide-y divide-border">
            {ordenadas.map((r, i) => (
              <div key={r.href} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-[13px] sm:flex-nowrap">
                <span className="w-6 shrink-0 tabular-nums text-muted-foreground/60">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={r.href} className="block truncate hover:underline">
                    {r.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                  {num(r.valor)}
                </span>
                <span className="hidden w-20 shrink-0 text-right tabular-nums text-muted-foreground sm:block">
                  {metrica === "alcance" ? "—" : pct(r.tasa)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
