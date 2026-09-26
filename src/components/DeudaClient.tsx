"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
import MateriaToggle from "@/components/MateriaToggle";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { Materia } from "@/lib/unidades";

/**
 * La deuda de medición, en DOS TABLAS que no se suman.
 *
 * Antes era una sola lista de piezas más un cartel explicando que los creativos
 * quedaban afuera. El cartel decía algo cierto —las dos deudas se pagan
 * distinto— pero lo decía en vez de mostrarlo: para ver la de campañas había que
 * irse a otra pantalla.
 *
 * POR QUÉ NO SE SUMAN. Una pieza en deuda se publicó y nadie la midió: existe
 * afuera, la vio gente, y el número se perdió. Un creativo en deuda todavía no
 * corrió en una ronda con números, así que no hay nada perdido — hay algo sin
 * empezar. Y cuando corra, se mide con hook-rate, CTR y costo por resultado, no
 * con alcance. Un total que las sume no significa nada.
 */

export type FilaDeuda = {
  slug: string;
  title: string;
  href: string;
  canal: string;
  /** Días desde que se publicó. `null` cuando no declara fecha. */
  dias: number | null;
  cobertura: string;
  sinEnlace: boolean;
};

export type FilaCreativo = {
  slug: string;
  title: string;
  relPath: string;
  persona: string;
  angulo: string;
  ronda: string;
  estado: string;
};

const COBERTURAS: Opcion[] = [
  { value: "pending", label: "Pendientes" },
  { value: "untracked", label: "Sin trackear" },
];

function faceta<T>(xs: T[], get: (x: T) => string): Opcion[] {
  const m = new Map<string, number>();
  for (const x of xs) {
    const v = get(x);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] text-muted-foreground">{k}</div>
        <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{v}</div>
      </CardContent>
    </Card>
  );
}

export default function DeudaClient({
  piezas,
  creativos,
  totalPiezas,
}: {
  piezas: FilaDeuda[];
  creativos: FilaCreativo[];
  totalPiezas: number;
}) {
  const [materia, setMateria] = useState<Materia>("organico");
  const [q, setQ] = useState("");
  const [canales, setCanales] = useState<string[]>([]);
  const [coberturas, setCoberturas] = useState<string[]>([]);
  const [soloSinEnlace, setSoloSinEnlace] = useState(false);
  const [personas, setPersonas] = useState<string[]>([]);
  const [angulos, setAngulos] = useState<string[]>([]);
  const [rondas, setRondas] = useState<string[]>([]);

  const esAds = materia === "ads";
  const limpiar = () => {
    setQ("");
    setCanales([]);
    setCoberturas([]);
    setSoloSinEnlace(false);
    setPersonas([]);
    setAngulos([]);
    setRondas([]);
  };
  const sucio =
    Boolean(q) ||
    soloSinEnlace ||
    [canales, coberturas, personas, angulos, rondas].some((x) => x.length > 0);

  const vistaPiezas = useMemo(() => {
    const t = q.trim().toLowerCase();
    const cs = new Set(canales);
    const cb = new Set(coberturas);
    return piezas.filter((p) => {
      if (t && !p.title.toLowerCase().includes(t)) return false;
      if (cs.size && !cs.has(p.canal)) return false;
      if (cb.size && !cb.has(p.cobertura)) return false;
      if (soloSinEnlace && !p.sinEnlace) return false;
      return true;
    });
  }, [piezas, q, canales, coberturas, soloSinEnlace]);

  const vistaCreativos = useMemo(() => {
    const t = q.trim().toLowerCase();
    const ps = new Set(personas);
    const as = new Set(angulos);
    const rs = new Set(rondas);
    return creativos.filter((c) => {
      if (t && !`${c.title} ${c.relPath}`.toLowerCase().includes(t)) return false;
      if (ps.size && !ps.has(c.persona)) return false;
      if (as.size && !as.has(c.angulo)) return false;
      if (rs.size && !rs.has(c.ronda)) return false;
      return true;
    });
  }, [creativos, q, personas, angulos, rondas]);

  // La más vieja de las VISIBLES: con un filtro puesto, el número de arriba tiene
  // que describir lo que se está mirando.
  const masVieja = vistaPiezas.reduce<number | null>(
    (m, p) => (p.dias !== null && (m === null || p.dias > m) ? p.dias : m),
    null,
  );
  const sinEnlace = vistaPiezas.filter((p) => p.sinEnlace).length;

  return (
    <>
      <MateriaToggle
        valor={materia}
        onChange={(m) => {
          setMateria(m);
          // Las facetas de una materia no significan nada en la otra, y dejarlas
          // puestas mostraría una tabla vacía sin motivo visible.
          limpiar();
        }}
        conteos={{ organico: piezas.length, ads: creativos.length }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="h-8 w-full text-xs sm:w-44"
          aria-label="Buscar"
        />
        {!esAds && (
          <>
            <MultiSelect titulo="Red" opciones={faceta(piezas, (p) => p.canal)} valor={canales} onChange={setCanales} />
            <MultiSelect titulo="Cobertura" opciones={COBERTURAS} valor={coberturas} onChange={setCoberturas} />
            <Button
              variant={soloSinEnlace ? "default" : "outline"}
              size="sm"
              onClick={() => setSoloSinEnlace(!soloSinEnlace)}
              aria-pressed={soloSinEnlace}
              title="Solo las que no declaran url: sin eso no hay con qué emparejar un export"
            >
              Solo sin enlace
            </Button>
          </>
        )}
        {esAds && (
          <>
            <MultiSelect titulo="Persona" opciones={faceta(creativos, (c) => c.persona)} valor={personas} onChange={setPersonas} />
            <MultiSelect titulo="Ángulo" opciones={faceta(creativos, (c) => c.angulo)} valor={angulos} onChange={setAngulos} />
            <MultiSelect titulo="Ronda" opciones={faceta(creativos, (c) => c.ronda)} valor={rondas} onChange={setRondas} buscable />
          </>
        )}
        {sucio && (
          <Button variant="ghost" size="sm" onClick={limpiar}>
            Limpiar
          </Button>
        )}
      </div>

      {esAds ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat k="Sin números" v={String(vistaCreativos.length)} />
            <Stat k="Rondas" v={String(new Set(vistaCreativos.map((c) => c.ronda).filter(Boolean)).size || "—")} />
            <Stat k="Personas" v={String(new Set(vistaCreativos.map((c) => c.persona).filter(Boolean)).size || "—")} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>creativo</TableHead>
                  <TableHead className="w-28">persona</TableHead>
                  <TableHead className="w-32">ángulo</TableHead>
                  <TableHead className="w-24">ronda</TableHead>
                  <TableHead className="w-28">estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vistaCreativos.map((c) => (
                  <TableRow key={c.relPath}>
                    <TableCell className="max-w-0">
                      <div className="truncate text-[13px]">{c.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{c.relPath}</div>
                    </TableCell>
                    <TableCell className="text-[12px]">{c.persona || "—"}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{c.angulo || "—"}</TableCell>
                    <TableCell className="text-[12px] tabular-nums text-muted-foreground">{c.ronda || "—"}</TableCell>
                    <TableCell>
                      {c.estado ? <Badge variant="outline">{c.estado}</Badge> : <span className="text-[12px] text-muted-foreground/40">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {vistaCreativos.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                Ningún creativo pasa estos filtros.
              </p>
            )}
          </div>

          <p className="mt-3 max-w-[74ch] text-[11px] leading-relaxed text-muted-foreground/70">
            Esta deuda no se suma con la del orgánico. Una pieza en deuda se publicó y
            nadie la midió: el número se perdió. Un creativo todavía no corrió en una ronda
            con números — no hay nada perdido, hay algo sin empezar.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat k="Sin medir" v={String(vistaPiezas.length)} />
            <Stat k="La más vieja" v={masVieja !== null ? `${masVieja} días` : "—"} />
            <Stat k="Sin enlace" v={String(sinEnlace)} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">esperando</TableHead>
                  <TableHead>pieza</TableHead>
                  <TableHead className="w-24">red</TableHead>
                  <TableHead className="w-40">estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vistaPiezas.map((p) => (
                  <TableRow key={p.slug}>
                    <TableCell className="tabular-nums text-[12px] text-muted-foreground">
                      {/* Una pieza sin fecha NO dice "hace 0 días": no se sabe hace
                          cuánto está así, y un 0 la pondría primera en una lista
                          que se lee de arriba para abajo. */}
                      {p.dias !== null ? `${p.dias} días` : "sin fecha"}
                    </TableCell>
                    <TableCell className="max-w-0">
                      <Link href={p.href} className="block truncate text-[13px] hover:underline">
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{p.canal}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {p.cobertura === "pending" && <Badge variant="secondary">pendiente</Badge>}
                      {p.sinEnlace && <Badge variant="outline" className="ml-1.5">sin enlace</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {vistaPiezas.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                {piezas.length === 0
                  ? `De ${totalPiezas} piezas, las publicadas tienen todas al menos un corte.`
                  : "Ninguna pieza pasa estos filtros."}
              </p>
            )}
          </div>

        </>
      )}
    </>
  );
}
