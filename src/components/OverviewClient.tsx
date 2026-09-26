"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import BarList from "@/components/BarList";
import RangoFechas, { RANGO_VACIO, type Rango } from "@/components/RangoFechas";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
import MateriaToggle from "@/components/MateriaToggle";
import { Button } from "@/components/ui/button";
import type { Materia } from "@/lib/unidades";
import { BarrasPorMes, BarraCompuesta, Medidor } from "@/components/Graficos";

/**
 * El overview, recalculado contra los filtros.
 *
 * El filtro vive en el cliente sobre una proyección mínima de cada pieza —fecha,
 * estado, cobertura, canal y los pocos números que suman—. Una `searchParams`
 * volvería dinámica la página, y que estas páginas sean estáticas es lo que
 * sostiene el aislamiento entre marcas: una ruta que se renderiza bajo demanda
 * lee el vault en el momento.
 *
 * Lo que NO viaja: el `body` de ninguna pieza.
 *
 * LOS FILTROS SON MULTI-SELECT salvo el rango. La pregunta real casi nunca es
 * "Instagram o Twitter", es "Instagram y Twitter, sin Blog" — y cada recorte
 * recalcula TODO lo que depende del conjunto: cadencia, deuda, alcance, la
 * composición del mes. Lo que no se recalcula son las fórmulas sin estrenar, y
 * eso está explicado abajo donde pasa.
 *
 * ADS NO ES UN FILTRO ACÁ, es un cambio de conjunto, y no hay conjunto: los
 * creativos están en el `ignore` de la fuente, así que esta página nunca los vio.
 * El toggle existe igual porque la pregunta es legítima; lo que hace es decir por
 * qué la respuesta no está acá y mandar a donde sí está.
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

const COBERTURAS: Opcion[] = [
  { value: "tracked", label: "Medidas" },
  { value: "pending", label: "Pendientes" },
  { value: "untracked", label: "Sin trackear" },
];

const ESTADOS: Opcion[] = [
  { value: "published", label: "Publicadas" },
  { value: "in-progress", label: "En curso" },
  { value: "draft", label: "Draft" },
  { value: "idea", label: "Idea" },
  { value: "backlog", label: "Backlog" },
  { value: "unknown", label: "Sin estado" },
];

/** Opciones de un campo con su conteo, sobre el conjunto SIN filtrar por ese campo. */
function opciones(piezas: OverviewPiece[], campo: "canal" | "formulaCode"): Opcion[] {
  const m = new Map<string, number>();
  for (const p of piezas) if (p[campo]) m.set(p[campo], (m.get(p[campo]) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

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
  dieta,
  formulasSinEstrenar,
  sinClasificar,
  creativos = 0,
}: {
  piezas: OverviewPiece[];
  account: string;
  label: string;
  /** La dieta de ESTA marca. Criterio del humano, no un default de la app. */
  dieta: { piso: number; techo: number };
  formulasSinEstrenar: string[];
  sinClasificar: number;
  /** Cuántos creativos tiene la marca. Solo para ofrecer el toggle y explicar. */
  creativos?: number;
}) {
  const { piso: PISO, techo: TECHO } = dieta;
  const [rango, setRango] = useState<Rango>(RANGO_VACIO);
  const [canales, setCanales] = useState<string[]>([]);
  const [formulas, setFormulas] = useState<string[]>([]);
  const [coberturas, setCoberturas] = useState<string[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [materia, setMateria] = useState<Materia>("organico");

  const conRango = Boolean(rango.desde || rango.hasta);
  const sucio =
    conRango ||
    canales.length > 0 ||
    formulas.length > 0 ||
    coberturas.length > 0 ||
    estados.length > 0;

  const limpiar = () => {
    setRango(RANGO_VACIO);
    setCanales([]);
    setFormulas([]);
    setCoberturas([]);
    setEstados([]);
  };

  const vista = useMemo(() => {
    const cs = new Set(canales);
    const fs = new Set(formulas);
    const cb = new Set(coberturas);
    const es = new Set(estados);
    return piezas.filter((p) => {
      // Una faceta vacía NO filtra: sin selección se ve todo, no nada.
      if (cs.size && !cs.has(p.canal)) return false;
      if (fs.size && !fs.has(p.formulaCode)) return false;
      if (cb.size && !cb.has(p.coverage)) return false;
      if (es.size && !es.has(p.status)) return false;
      if (conRango) {
        // Sin fecha, fuera del rango. Se dice abajo.
        if (!p.publishedAt) return false;
        if (rango.desde && p.publishedAt < rango.desde) return false;
        if (rango.hasta && p.publishedAt > rango.hasta) return false;
      }
      return true;
    });
  }, [piezas, canales, formulas, coberturas, estados, conRango, rango.desde, rango.hasta]);

  const excluidas = piezas.length - vista.length;

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
    // Las fórmulas y la clasificación NO dependen de los filtros: son del
    // catálogo contra el TOTAL, y recortarlas daría "sin estrenar en los últimos
    // 30 días" o "sin estrenar en Instagram", que son otras preguntas. Como no se
    // recalculan, con cualquier filtro puesto se esconden en vez de mostrar un
    // número que no corresponde a lo que se está mirando.
    !sucio && formulasSinEstrenar.length > 0 && {
      href: `/${account}/formulas`,
      titulo: `${fmt(formulasSinEstrenar.length)} fórmulas sin estrenar`,
      detalle: formulasSinEstrenar.slice(0, 6).join(" · "),
    },
    !sucio && sinClasificar > 0 && {
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
        subtitle={`${label} · ${fmt(vista.length)} piezas${sucio ? ` de ${fmt(piezas.length)}` : ""}`}
        acciones={<RangoFechas valor={rango} onChange={setRango} />}
      />

      {/* Ads no filtra este conjunto: lo cambia, y acá no existe. Ver el panel. */}
      <MateriaToggle
        valor={materia}
        onChange={setMateria}
        conteos={{ organico: piezas.length, ads: creativos }}
      />

      {materia === "ads" ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">
              Este overview no incluye los {fmt(creativos)} creativos, y no es un olvido.
            </p>
            <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">
              Ninguno tiene números cargados —son briefs— y cuando los tengan no se van a
              medir con esto: a un creativo le pesan hook-rate, CTR y costo por resultado,
              no alcance ni guardados. Promediarlos con el orgánico daría una cadencia y
              una deuda que no significan nada. Lo que sí se puede ver hoy es la{" "}
              <Link href={`/${account}/campanas`} className="text-primary hover:underline">
                cobertura por persona × dolor × ángulo
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MultiSelect titulo="Red" opciones={opciones(piezas, "canal")} valor={canales} onChange={setCanales} />
        <MultiSelect titulo="Fórmula" opciones={opciones(piezas, "formulaCode")} valor={formulas} onChange={setFormulas} buscable />
        <MultiSelect titulo="Cobertura" opciones={COBERTURAS} valor={coberturas} onChange={setCoberturas} />
        <MultiSelect titulo="Estado" opciones={ESTADOS} valor={estados} onChange={setEstados} />
        {sucio && (
          <Button variant="ghost" size="sm" onClick={limpiar}>
            Limpiar
          </Button>
        )}
      </div>

      {sucio && excluidas > 0 && (
        // Decir qué quedó afuera y por qué. Sin esto, una pieza sin fecha —o de
        // una red deseleccionada— parece que no existe.
        <p className="-mt-2 mb-5 text-[11px] text-muted-foreground/70">
          {fmt(excluidas)} piezas fuera de estos filtros
          {conRango ? ", incluidas las que no declaran fecha" : ""}.
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

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                Cadencia · piezas publicadas por mes
              </h3>
              <span className="text-[11px] text-muted-foreground/70">
                objetivo {PISO}-{TECHO}
              </span>
            </div>
            {porMes.length === 0 ? (
              <p className="text-[13px] text-muted-foreground/70">
                Ninguna pieza publicada declara fecha, así que no hay meses que dibujar.
              </p>
            ) : (
              <BarrasPorMes
                datos={porMes.slice(-12).map(([label, value]) => ({ label, value }))}
                piso={PISO}
                techo={TECHO}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">
              Cobertura de medición
            </h3>
            <Medidor
              valor={medidas.length}
              total={vista.length}
              etiqueta="de las piezas tienen al menos un corte medido"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Medición</h3>
            <BarraCompuesta
              tramos={[
                { label: "Medidas", value: vista.filter((p) => p.coverage === "tracked").length, clase: "bg-primary" },
                { label: "Pendientes", value: vista.filter((p) => p.coverage === "pending").length, clase: "bg-muted-foreground/45" },
                { label: "Sin trackear", value: vista.filter((p) => p.coverage === "untracked").length, clase: "bg-muted-foreground/20" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por canal</h3>
            <BarList items={topN(cuenta("canal"), 6)} labelClassName="w-20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-xs font-medium text-muted-foreground">Por estado</h3>
            <BarList items={topN(cuenta("status"), 6)} labelClassName="w-20" />
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </>
  );
}
