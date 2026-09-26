"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
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

export type Mes = { month: string; piezas: PiezaDelMes[] };

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
  meses,
  piso,
  techo,
  sinFecha,
  totalPublicadas,
  mesEnCurso,
}: {
  meses: Mes[];
  piso: number;
  techo: number;
  /** Publicadas que no declaran fecha: no entran en ningún mes. */
  sinFecha: number;
  totalPublicadas: number;
  /** El mes del build, para no leer un mes incompleto como un mes flojo. */
  mesEnCurso: string;
}) {
  const [canales, setCanales] = useState<string[]>([]);
  const [formulas, setFormulas] = useState<string[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  const todas = useMemo(() => meses.flatMap((m) => m.piezas), [meses]);
  const filtrado = canales.length > 0 || formulas.length > 0;

  const vista = useMemo(() => {
    const cs = new Set(canales);
    const fs = new Set(formulas);
    return meses
      .map((m) => ({
        month: m.month,
        piezas: m.piezas.filter(
          (p) =>
            (!cs.size || cs.has(p.canal)) && (!fs.size || fs.has(p.formulaCode)),
        ),
      }))
      // Un mes que queda en cero por el filtro SE MUESTRA: "no publiqué nada de
      // esto en junio" es exactamente lo que se está preguntando.
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [meses, canales, formulas]);

  const cerrados = vista.filter((m) => m.month !== mesEnCurso);
  const bajoPiso = cerrados.filter((m) => m.piezas.length < piso).length;
  const enObjetivo = cerrados.filter(
    (m) => m.piezas.length >= piso && m.piezas.length <= techo,
  ).length;
  const conteos = cerrados.map((m) => m.piezas.length);
  const mediana = conteos.length
    ? [...conteos].sort((a, b) => a - b)[Math.floor(conteos.length / 2)]
    : 0;
  const enCurso = vista.find((m) => m.month === mesEnCurso);

  const max = Math.max(filtrado ? 1 : techo, ...vista.map((m) => m.piezas.length));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MultiSelect titulo="Red" opciones={faceta(todas, (p) => p.canal)} valor={canales} onChange={setCanales} />
        <MultiSelect titulo="Fórmula" opciones={faceta(todas, (p) => p.formulaCode)} valor={formulas} onChange={setFormulas} buscable />
        {filtrado && (
          <Button variant="ghost" size="sm" onClick={() => { setCanales([]); setFormulas([]); }}>
            Limpiar
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          k="Mediana por mes"
          v={String(mediana)}
          sub={filtrado ? "del recorte" : `objetivo ${piso}-${techo}`}
        />
        <Stat
          k="Meses bajo el piso"
          v={filtrado ? "—" : `${bajoPiso}`}
          sub={filtrado ? "el objetivo es del total" : `de ${cerrados.length} cerrados`}
        />
        <Stat
          k="Meses en objetivo"
          v={filtrado ? "—" : `${enObjetivo}`}
          sub={filtrado ? "el objetivo es del total" : `de ${cerrados.length} cerrados`}
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
              const esCurso = m.month === mesEnCurso;
              const bajo = !filtrado && !esCurso && n < piso;
              const abierta = abierto === m.month;
              return (
                <div key={m.month}>
                  <button
                    type="button"
                    onClick={() => setAbierto(abierta ? null : m.month)}
                    aria-expanded={abierta}
                    disabled={n === 0}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <span className="w-16 shrink-0 font-mono text-muted-foreground">{m.month}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-secondary">
                      {/* La banda del objetivo solo con el total a la vista: la
                          dieta es de la marca, y dibujarla contra un canal solo
                          diría que todos los meses están flojos. */}
                      {!filtrado && (
                        <div
                          className="absolute inset-y-0 border-x border-dashed border-muted-foreground/40 bg-muted-foreground/5"
                          style={{ left: `${(piso / max) * 100}%`, width: `${((techo - piso) / max) * 100}%` }}
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
                      {bajo && <span className="ml-1 text-[11px]">−{piso - n}</span>}
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
        {filtrado ? (
          <>
            Con un filtro puesto no se dibuja la banda del objetivo: la dieta de {piso}-{techo}{" "}
            cuenta todo lo publicado, no un canal por separado.
          </>
        ) : (
          <>
            La banda punteada es el objetivo de {piso}-{techo}, declarado en la config y no
            derivado del promedio — sacarlo de lo que viene pasando garantiza no estar nunca
            por debajo. El número chico es lo que faltó para el piso.
            {enCurso ? " El mes en curso no cuenta para los totales: está incompleto." : ""}
          </>
        )}
      </p>
    </>
  );
}
