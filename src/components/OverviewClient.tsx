"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import BarList from "@/components/BarList";
import RangoFechas, { RANGO_VACIO, type Rango } from "@/components/RangoFechas";

/**
 * El overview, recalculado contra un rango de fechas.
 *
 * El filtro vive en el cliente sobre una proyección mínima de cada pieza —fecha,
 * estado, cobertura, canal y los pocos números que suman—. Una `searchParams`
 * volvería dinámica la página, y que estas páginas sean estáticas es lo que
 * sostiene el aislamiento entre marcas: una ruta que se renderiza bajo demanda
 * lee el vault en el momento.
 *
 * Lo que NO viaja: el `body` de ninguna pieza.
 */

export type OverviewPiece = {
  href: string;
  canal: string;
  status: string;
  coverage: string;
  publishedAt: string;
  formulaCode: string;
  impressions: number | null;
  views: number | null;
  follows: number | null;
  bookmarks: number | null;
  /** Días desde la publicación, calculado en el servidor. `null` sin fecha. */
  dias: number | null;
  sinEnlace: boolean;
};

const PISO = 10;

const ETIQUETA: Record<string, string> = {
  published: "publicadas",
  "in-progress": "en curso",
  draft: "draft",
  idea: "idea",
  backlog: "backlog",
  unknown: "sin estado",
  unknown_canal: "sin red",
};

function Stat({ k, v, sub, good }: { k: string; v: string; sub?: string; good?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{k}</div>
        <div
          className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${
            good ? "text-[var(--tg-green)]" : ""
          }`}
        >
          {v}
        </div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const fmt = (n: number) => n.toLocaleString("es-AR");

/** Piezas publicadas por mes, ordenadas. Fuera del componente: es una función
 *  pura sobre sus argumentos, y el compilador de React la memoiza sola. */
function contarMeses(publicadas: OverviewPiece[]): [string, number][] {
  const m: Record<string, number> = {};
  for (const p of publicadas) {
    if (!p.publishedAt) continue;
    const mes = p.publishedAt.slice(0, 7);
    m[mes] = (m[mes] ?? 0) + 1;
  }
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
}

function topN(rec: Record<string, number>, n: number) {
  const s = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  const head = s.slice(0, n).map(([label, value]) => ({ label: ETIQUETA[label] ?? label, value }));
  const rest = s.slice(n).reduce((acc, [, v]) => acc + v, 0);
  if (rest > 0) head.push({ label: "otros", value: rest });
  return head;
}

export default function OverviewClient({
  piezas,
  account,
  label,
  formulasSinEstrenar,
  sinClasificar,
}: {
  piezas: OverviewPiece[];
  account: string;
  label: string;
  formulasSinEstrenar: string[];
  sinClasificar: number;
}) {
  const [rango, setRango] = useState<Rango>(RANGO_VACIO);
  const conRango = Boolean(rango.desde || rango.hasta);

  const vista = useMemo(
    () =>
      conRango
        ? piezas.filter(
            (p) =>
              p.publishedAt &&
              (!rango.desde || p.publishedAt >= rango.desde) &&
              (!rango.hasta || p.publishedAt <= rango.hasta),
          )
        : piezas,
    [piezas, rango.desde, rango.hasta, conRango],
  );
  const excluidasPorFecha = piezas.length - vista.length;

  const medidas = vista.filter((p) => p.coverage === "tracked");
  const publicadas = vista.filter((p) => p.status === "published");
  const deuda = publicadas.filter((p) => p.coverage !== "tracked");
  const sinFecha = publicadas.filter((p) => !p.publishedAt).length;
  const masVieja = deuda.reduce<number | null>(
    (m, p) => (p.dias !== null && (m === null || p.dias > m) ? p.dias : m),
    null,
  );

  const suma = (k: "impressions" | "views" | "follows" | "bookmarks") =>
    medidas.reduce((s, p) => s + (p[k] ?? 0), 0);

  const porMes = contarMeses(publicadas);
  const ultimoMes = porMes[porMes.length - 1];

  const atencion = [
    deuda.length > 0 && {
      href: `/${account}/deuda`,
      titulo: `${fmt(deuda.length)} publicadas sin medir`,
      detalle: masVieja !== null ? `la más vieja hace ${fmt(masVieja)} días` : "ninguna declara desde cuándo",
    },
    ultimoMes && ultimoMes[1] < PISO && {
      href: `/${account}/cadencia`,
      titulo: `${ultimoMes[0]}: ${ultimoMes[1]} piezas`,
      detalle: `faltan ${PISO - ultimoMes[1]} para el piso de ${PISO}`,
    },
    sinFecha > 0 && {
      href: `/${account}/cadencia`,
      titulo: `${fmt(sinFecha)} publicadas sin fecha`,
      detalle: "no entran en ninguna cadencia",
    },
    // Las fórmulas y la clasificación NO dependen del rango: son del catálogo
    // contra el total, y recortarlas por fecha daría "sin estrenar en los
    // últimos 30 días", que es otra pregunta.
    !conRango && formulasSinEstrenar.length > 0 && {
      href: `/${account}/formulas`,
      titulo: `${fmt(formulasSinEstrenar.length)} fórmulas sin estrenar`,
      detalle: formulasSinEstrenar.slice(0, 6).join(" · "),
    },
    !conRango && sinClasificar > 0 && {
      href: `/${account}/formulas`,
      titulo: `${fmt(sinClasificar)} sin fórmula asignada`,
      detalle: `de ${fmt(piezas.length)} piezas`,
    },
  ].filter(Boolean) as { href: string; titulo: string; detalle: string }[];

  const cuenta = (k: "canal" | "status") => {
    const m: Record<string, number> = {};
    for (const p of vista) {
      const v = k === "canal" ? (p.canal === "unknown" ? "unknown_canal" : p.canal) : p.status;
      m[v] = (m[v] ?? 0) + 1;
    }
    return m;
  };

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`${label} · ${fmt(vista.length)} piezas${conRango ? " en el rango" : ""}`}
        acciones={<RangoFechas valor={rango} onChange={setRango} />}
      />

      {conRango && excluidasPorFecha > 0 && (
        // Un rango deja afuera lo que no tiene fecha, y eso hay que decirlo: si
        // no, una pieza sin fecha parece que no existe.
        <p className="-mt-4 mb-5 text-[11px] text-muted-foreground/70">
          {fmt(excluidasPorFecha)} piezas fuera del rango o sin fecha declarada.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat k="Piezas" v={fmt(vista.length)} sub={`${fmt(publicadas.length)} publicadas`} />
        <Stat
          k="Medidas"
          v={fmt(medidas.length)}
          sub={`${Math.round((medidas.length / Math.max(vista.length, 1)) * 100)}% del total`}
        />
        <Stat k="Sin medir" v={fmt(deuda.length)} sub="publicadas" />
        <Stat k="Alcance Σ" v={fmt(suma("impressions") + suma("views"))} />
        <Stat k="Follows Σ" v={fmt(suma("follows"))} good />
        <Stat k="Guardados Σ" v={fmt(suma("bookmarks"))} />
      </div>

      {atencion.length > 0 && (
        <>
          <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Requiere atención
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border">
              {atencion.map((a) => (
                <Link
                  key={a.titulo}
                  href={a.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{a.titulo}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{a.detalle}</div>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-muted-foreground">→</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-9 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        Distribución
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por canal</h3>
            <BarList items={topN(cuenta("canal"), 6)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por estado</h3>
            <BarList items={topN(cuenta("status"), 6)} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
