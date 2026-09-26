"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
import RangoFechas, { RANGO_VACIO, type Rango } from "@/components/RangoFechas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRANULARIDADES, bucketDe, mesesDe, type Granularidad } from "@/lib/periodos";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

/**
 * La cadencia contra la dieta declarada.
 *
 * Era una lista de barras sin nada que tocar: no se podía preguntar "¿sostengo
 * la cadencia EN X?" —que con varias redes es la pregunta real— ni llegar a las
 * piezas de un mes flojo sin ir a buscarlas.
 *
 * LO QUE NO SE PUEDE HACER, Y POR QUÉ NO SE HACE: con un filtro de red puesto,
 * la banda del objetivo DESAPARECE. La dieta es de la marca y cuenta el total de
 * lo publicado; compararla contra un solo canal diría que todos los meses están
 * por debajo del piso, que es falso. Preferir un gráfico incompleto a uno que
 * miente es la misma regla de siempre.
 */

export type PiezaDelMes = {
  slug: string;
  title: string;
  href: string;
  canal: string;
  formulaCode: string;
  publishedAt: string;
  medida: boolean;
};

/** Un período con sus piezas. La granularidad la elige quien mira. */
export type Periodo = { clave: string; piezas: PiezaDelMes[] };

function faceta(ps: PiezaDelMes[], get: (p: PiezaDelMes) => string): Opcion[] {
  const m = new Map<string, number>();
  for (const p of ps) {
    const v = get(p);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{k}</div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{v}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function CadenciaClient({
  piezas: todas,
  piso,
  techo,
  sinFecha,
  totalPublicadas,
  hoy,
}: {
  /** Todas las publicadas CON fecha. El agrupado lo hace la vista. */
  piezas: PiezaDelMes[];
  piso: number;
  techo: number;
  /** Publicadas que no declaran fecha: no entran en ningún período. */
  sinFecha: number;
  totalPublicadas: number;
  /** La fecha del build, para no leer un período incompleto como uno flojo. */
  hoy: string;
}) {
  const [granularidad, setGranularidad] = useState<Granularidad>("mes");
  const [rango, setRango] = useState<Rango>(RANGO_VACIO);
  const [canales, setCanales] = useState<string[]>([]);
  const [formulas, setFormulas] = useState<string[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  const conRango = Boolean(rango.desde || rango.hasta);
  const filtrado = canales.length > 0 || formulas.length > 0;
  const enCursoClave = bucketDe(hoy, granularidad);

  // El objetivo ESCALADO al período. Es aritmética sobre la dieta declarada —a
  // trimestre ×3, a año ×12— y no una estimación. A semana no hay: 4,33 semanas
  // por mes daría una meta con decimales que nadie declaró.
  const meses = mesesDe(granularidad);
  const pisoP = meses === null ? null : piso * meses;
  const techoP = meses === null ? null : techo * meses;

  const vista = useMemo(() => {
    const cs = new Set(canales);
    const fs = new Set(formulas);
    const buckets = new Map<string, PiezaDelMes[]>();
    for (const p of todas) {
      if (rango.desde && p.publishedAt < rango.desde) continue;
      if (rango.hasta && p.publishedAt > rango.hasta) continue;
      if (cs.size && !cs.has(p.canal)) continue;
      if (fs.size && !fs.has(p.formulaCode)) continue;
      const k = bucketDe(p.publishedAt, granularidad);
      buckets.set(k, [...(buckets.get(k) ?? []), p]);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([clave, ps]) => ({ clave, piezas: ps }));
  }, [todas, canales, formulas, granularidad, rango.desde, rango.hasta]);

  const cerrados = vista.filter((m) => m.clave !== enCursoClave);
  const bajoPiso = pisoP === null ? 0 : cerrados.filter((m) => m.piezas.length < pisoP).length;
  const enObjetivo =
    pisoP === null || techoP === null
      ? 0
      : cerrados.filter((m) => m.piezas.length >= pisoP && m.piezas.length <= techoP).length;
  const conteos = cerrados.map((m) => m.piezas.length);
  const mediana = conteos.length
    ? [...conteos].sort((a, b) => a - b)[Math.floor(conteos.length / 2)]
    : 0;
  const enCurso = vista.find((m) => m.clave === enCursoClave);

  // La banda solo se dibuja con el objetivo a la vista: sin él, la escala la
  // fija el período más alto.
  const conBanda = !filtrado && pisoP !== null && techoP !== null;
  // Por qué no hay objetivo, dicho donde se nota su ausencia.
  const razonSinBanda =
    pisoP === null
      ? "una semana no es fracción limpia de un mes"
      : "el objetivo cuenta el total, no un recorte";
  const max = Math.max(conBanda ? techoP! : 1, ...vista.map((m) => m.piezas.length));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* La granularidad primero: cambia qué significa cada barra, así que es
            una decisión de otro orden que filtrar. */}
        <Select value={granularidad} onValueChange={(v) => { setGranularidad(v as Granularidad); setAbierto(null); }}>
          <SelectTrigger className="w-[9.5rem]" aria-label="Agrupar por período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARIDADES.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RangoFechas valor={rango} onChange={setRango} conCalendario />
        <MultiSelect titulo="Red" opciones={faceta(todas, (p) => p.canal)} valor={canales} onChange={setCanales} />
        <MultiSelect titulo="Fórmula" opciones={faceta(todas, (p) => p.formulaCode)} valor={formulas} onChange={setFormulas} buscable />
        {(filtrado || conRango || granularidad !== "mes") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCanales([]); setFormulas([]); setRango(RANGO_VACIO); setGranularidad("mes"); }}
          >
            Limpiar
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          k="Mediana por período"
          v={String(mediana)}
          sub={pisoP !== null && !filtrado ? `objetivo ${pisoP}-${techoP}` : "del recorte"}
        />
        <Stat
          k="Bajo el piso"
          v={conBanda ? `${bajoPiso}` : "—"}
          sub={conBanda ? `de ${cerrados.length} cerrados` : razonSinBanda}
        />
        <Stat
          k="En objetivo"
          v={conBanda ? `${enObjetivo}` : "—"}
          sub={conBanda ? `de ${cerrados.length} cerrados` : razonSinBanda}
        />
        {/* El dato que estaba en un bloque de texto arriba. Sigue importando —son
            casi la mitad de las publicadas— pero es una cifra, no un párrafo: las
            piezas sin fecha NO se reparten entre los meses, así que lo de abajo es
            la cadencia de las que sí la declaran. */}
        <Stat
          k="Publicadas sin fecha"
          v={String(sinFecha)}
          sub={`de ${totalPublicadas} · fuera del gráfico`}
        />
      </div>

      {vista.length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">Ninguna pieza publicada declara fecha.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              No es que no se publicó: es que no se puede saber cuándo. La fecha va en el
              campo <code>date</code> del footer, o adentro del estado
              (<code>estado: Publicado 2026-07-08</code>).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="divide-y divide-border">
            {vista.map((m) => {
              const n = m.piezas.length;
              const esCurso = m.clave === enCursoClave;
              const bajo = conBanda && !esCurso && n < pisoP!;
              const abierta = abierto === m.clave;
              return (
                <div key={m.clave}>
                  <button
                    type="button"
                    onClick={() => setAbierto(abierta ? null : m.clave)}
                    aria-expanded={abierta}
                    disabled={n === 0}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="w-[4.5rem] shrink-0 font-mono text-[12px] text-muted-foreground">{m.clave}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-secondary">
                      {/* La banda del objetivo solo con el total a la vista: la
                          dieta es de la marca, y dibujarla contra un canal solo
                          diría que todos los meses están flojos. */}
                      {conBanda && (
                        <div
                          className="absolute inset-y-0 border-x border-dashed border-muted-foreground/40 bg-muted-foreground/5"
                          style={{ left: `${(pisoP! / max) * 100}%`, width: `${((techoP! - pisoP!) / max) * 100}%` }}
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className={`h-full rounded-r ${bajo ? "bg-muted-foreground/50" : "bg-primary"}`}
                        style={{ width: `${(n / max) * 100}%` }}
                      />
                    </div>
                    {esCurso && <Badge variant="secondary">en curso</Badge>}
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
                      {n}
                      {bajo && <span className="ml-1 text-[11px]">−{pisoP! - n}</span>}
                    </span>
                  </button>

                  {abierta && (
                    <div className="border-t border-border bg-muted/20 px-3 py-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>pieza</TableHead>
                            <TableHead className="w-24">red</TableHead>
                            <TableHead className="w-16">fórmula</TableHead>
                            <TableHead className="w-24">fecha</TableHead>
                            <TableHead className="w-24">medida</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {m.piezas.map((p) => (
                            <TableRow key={p.slug}>
                              <TableCell className="max-w-0">
                                <Link href={p.href} className="block truncate text-[12px] hover:underline">
                                  {p.title}
                                </Link>
                              </TableCell>
                              <TableCell className="text-[12px] text-muted-foreground">{p.canal}</TableCell>
                              <TableCell className="font-mono text-[12px] text-muted-foreground">
                                {p.formulaCode || "—"}
                              </TableCell>
                              <TableCell className="tabular-nums text-[12px] text-muted-foreground">
                                {p.publishedAt}
                              </TableCell>
                              <TableCell>
                                {p.medida ? (
                                  <Badge variant="success">medida</Badge>
                                ) : (
                                  <span className="text-[12px] text-muted-foreground/40">—</span>
                                )}
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
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
        {!conBanda ? (
          pisoP === null ? (
            <>
              Por semana no se dibuja objetivo: la dieta está declarada por MES, y 4,33
              semanas por mes daría una meta con decimales que nadie declaró. A trimestre
              y a año sí, multiplicada exacto.
            </>
          ) : (
            <>
              Con un filtro puesto no se dibuja la banda: la dieta de {piso}-{techo} por mes
              cuenta todo lo publicado, no un canal por separado.
            </>
          )
        ) : (
          <>
            La banda punteada es el objetivo de {pisoP}-{techoP} para este período
            ({piso}-{techo} por mes), declarado en la config y no
            derivado del promedio — sacarlo de lo que viene pasando garantiza no estar nunca
            por debajo. El número chico es lo que faltó para el piso.
            {enCurso ? " El período en curso no cuenta para los totales: está incompleto." : ""}
          </>
        )}
      </p>
    </>
  );
}
