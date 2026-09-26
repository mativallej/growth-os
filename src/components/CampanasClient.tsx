"use client";

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

/**
 * Campañas: la matriz de cobertura ES el filtro, y el detalle va abajo.
 *
 * La matriz sola respondía "cuántos hay" y dejaba colgada la pregunta que sigue
 * inmediatamente —"cuáles"— sin ningún lugar donde ir a buscarla. Un número en
 * una celda que no se puede abrir obliga a salir de la app y buscar la carpeta a
 * mano, que es exactamente el trabajo que esto existe para ahorrar.
 *
 * LOS CEROS NO SON CLICKEABLES, a propósito. Una celda en cero no tiene detalle
 * que mostrar: abrirla daría una tabla vacía, y una tabla vacía se lee como un
 * error de la app en vez de como el hueco que es. La raya ya lo dice.
 */

export type CreativoRow = {
  slug: string;
  title: string;
  relPath: string;
  persona?: string;
  publico?: string;
  dolor?: string;
  formato?: string;
  angulo?: string;
  anguloRaw?: string;
  ronda?: string;
  estado?: string;
  derivadas: string[];
};

/**
 * El EJE de la matriz, que sale del framework del vault y NO de los creativos.
 *
 * Es la diferencia que hace que esta vista sirva: las personas y sus dolores son
 * lo que SE PODRÍA cubrir, y los creativos son lo que se cubrió. Si el eje saliera
 * de los creativos, una persona sin ninguno desaparecería de la tabla — y esa
 * persona es justamente el hallazgo.
 *
 * Por eso tampoco se recorta con los filtros: filtrar por ronda tiene que mostrar
 * qué quedó SIN CUBRIR en esa ronda, no esconder las filas vacías.
 */
export type PersonaEje = {
  persona: string;
  publico?: string;
  /** Los dolores que el framework declara para esta persona. */
  dolores: string[];
};

type Filtros = {
  q: string;
  personas: string[];
  publicos: string[];
  dolores: string[];
  formatos: string[];
  angulos: string[];
  rondas: string[];
  estados: string[];
  soloDeducidas: boolean;
};

const VACIOS: Filtros = {
  q: "",
  personas: [],
  publicos: [],
  dolores: [],
  formatos: [],
  angulos: [],
  rondas: [],
  estados: [],
  soloDeducidas: false,
};

/** Opciones de una dimensión con su conteo, sobre el universo completo. */
function faceta(cs: CreativoRow[], campo: keyof CreativoRow): Opcion[] {
  const m = new Map<string, number>();
  for (const c of cs) {
    const v = c[campo];
    if (typeof v === "string" && v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

function aplicar(cs: CreativoRow[], f: Filtros): CreativoRow[] {
  const q = f.q.trim().toLowerCase();
  const sets = {
    persona: new Set(f.personas),
    publico: new Set(f.publicos),
    dolor: new Set(f.dolores),
    formato: new Set(f.formatos),
    angulo: new Set(f.angulos),
    ronda: new Set(f.rondas),
    estado: new Set(f.estados),
  } as const;
  return cs.filter((c) => {
    if (q && !`${c.title} ${c.relPath}`.toLowerCase().includes(q)) return false;
    for (const [campo, set] of Object.entries(sets)) {
      if (set.size && !set.has((c[campo as keyof CreativoRow] as string) ?? "")) return false;
    }
    // Una dimensión DEDUCIDA de la ruta se rompe si el archivo se mueve, así que
    // poder aislarlas es poder arreglarlas.
    if (f.soloDeducidas && c.derivadas.length === 0) return false;
    return true;
  });
}

/** Qué recorte está activo. `null` en ángulo = toda la fila de la persona. */
type Seleccion = { persona: string; angulo: string | null } | null;

function Celda({
  n,
  activa,
  onClick,
}: {
  n: number;
  activa: boolean;
  onClick?: () => void;
}) {
  if (n === 0) {
    // El cero se dibuja como raya: no es "cero medido", es "no se produjo".
    return (
      <td className="px-2 py-2 text-center tabular-nums">
        <span className="text-muted-foreground/25">—</span>
      </td>
    );
  }
  return (
    <td className="px-2 py-2 text-center tabular-nums">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={activa}
        className={`inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 font-medium transition-colors ${
          activa
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 hover:bg-primary/25"
        }`}
      >
        {n}
      </button>
    </td>
  );
}

export default function CampanasClient({
  eje,
  angulos,
  creativos,
}: {
  eje: PersonaEje[];
  angulos: string[];
  creativos: CreativoRow[];
}) {
  const [sel, setSel] = useState<Seleccion>(null);
  const [f, setF] = useState<Filtros>(VACIOS);

  const set = <K extends keyof Filtros>(k: K) => (v: Filtros[K]) => setF({ ...f, [k]: v });
  const sucio =
    Boolean(f.q) ||
    f.soloDeducidas ||
    [f.personas, f.publicos, f.dolores, f.formatos, f.angulos, f.rondas, f.estados].some(
      (x) => x.length > 0,
    );

  // Los creativos que pasan los filtros. TODO lo demás se deriva de acá.
  const visibles = useMemo(() => aplicar(creativos, f), [creativos, f]);

  // LA MATRIZ SE RECALCULA CON LOS FILTROS, y ese es el punto de tenerlos acá.
  // Filtrar por ronda no es "mostrame esos creativos": es "cómo quedó la
  // cobertura EN esa ronda", que es la pregunta que la vista existe para
  // responder. Los ejes NO se recortan, así que los ceros siguen apareciendo —
  // y con un filtro puesto hay más ceros, que es exactamente el hallazgo.
  const matriz = useMemo(() => {
    const porPersonaAngulo = new Map<string, number>();
    const porPersona = new Map<string, number>();
    const doloresCubiertos = new Map<string, Set<string>>();
    for (const c of visibles) {
      if (!c.persona) continue;
      porPersona.set(c.persona, (porPersona.get(c.persona) ?? 0) + 1);
      if (c.angulo) {
        const k = `${c.persona}\u0000${c.angulo}`;
        porPersonaAngulo.set(k, (porPersonaAngulo.get(k) ?? 0) + 1);
      }
      if (c.dolor) {
        const s = doloresCubiertos.get(c.persona) ?? new Set<string>();
        s.add(c.dolor);
        doloresCubiertos.set(c.persona, s);
      }
    }
    return eje.map((e) => ({
      ...e,
      total: porPersona.get(e.persona) ?? 0,
      cubiertos: doloresCubiertos.get(e.persona)?.size ?? 0,
      porAngulo: Object.fromEntries(
        angulos.map((a) => [a, porPersonaAngulo.get(`${e.persona}\u0000${a}`) ?? 0]),
      ) as Record<string, number>,
    }));
  }, [visibles, eje, angulos]);


  // Clickear lo ya seleccionado deselecciona. Sin eso el único modo de volver a
  // ver todo es el botón de limpiar, y la celda encendida queda como una trampa.
  const alternar = (persona: string, angulo: string | null) =>
    setSel((x) => (x && x.persona === persona && x.angulo === angulo ? null : { persona, angulo }));

  const detalle = sel
    ? visibles.filter(
        (c) => c.persona === sel.persona && (sel.angulo === null || c.angulo === sel.angulo),
      )
    : visibles;

  const rotulo = sel
    ? `${sel.persona}${sel.angulo ? ` · ${sel.angulo}` : ""}`
    : sucio
      ? "los creativos filtrados"
      : "todos los creativos";

  return (
    <>
      {/* LOS FILTROS VAN ARRIBA DE LA MATRIZ porque la afectan. Las facetas salen
          del universo completo y no de lo ya filtrado: una opción que desaparece
          al elegir otra hace imposible saber qué combinaciones existen. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={f.q}
          onChange={(e) => set("q")(e.target.value)}
          placeholder="Buscar…"
          className="h-8 w-full text-xs sm:w-44"
          aria-label="Buscar"
        />
        <MultiSelect titulo="Persona" opciones={faceta(creativos, "persona")} valor={f.personas} onChange={set("personas")} />
        <MultiSelect titulo="Público" opciones={faceta(creativos, "publico")} valor={f.publicos} onChange={set("publicos")} />
        <MultiSelect titulo="Dolor" opciones={faceta(creativos, "dolor")} valor={f.dolores} onChange={set("dolores")} buscable />
        <MultiSelect titulo="Ángulo" opciones={faceta(creativos, "angulo")} valor={f.angulos} onChange={set("angulos")} />
        <MultiSelect titulo="Formato" opciones={faceta(creativos, "formato")} valor={f.formatos} onChange={set("formatos")} />
        <MultiSelect titulo="Ronda" opciones={faceta(creativos, "ronda")} valor={f.rondas} onChange={set("rondas")} buscable />
        <MultiSelect titulo="Estado" opciones={faceta(creativos, "estado")} valor={f.estados} onChange={set("estados")} />

        {/* Una dimensión deducida de la ruta se rompe si el archivo se mueve.
            Poder aislarlas es poder arreglarlas. */}
        {creativos.some((c) => c.derivadas.length > 0) && (
          <Button
            variant={f.soloDeducidas ? "default" : "outline"}
            size="sm"
            onClick={() => set("soloDeducidas")(!f.soloDeducidas)}
            aria-pressed={f.soloDeducidas}
            title="Solo los creativos con alguna dimensión deducida de la ruta en vez de declarada"
          >
            Solo deducidas
          </Button>
        )}

        {sucio && (
          <Button variant="ghost" size="sm" onClick={() => { setF(VACIOS); setSel(null); }}>
            Limpiar
          </Button>
        )}
      </div>

      <div className="mb-2 flex items-baseline justify-between gap-3">
        {/* El conteo de personas vacías no se escribe: la matriz de abajo ya
            muestra esas filas enteras en raya. Tuvo una tarjeta y después una
            línea, y las dos repetían con palabras algo que se ve de un vistazo. */}
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Cobertura por persona × ángulo
          {sucio && (
            <span className="ml-2 normal-case tracking-normal">
              · sobre {visibles.length} de {creativos.length}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground/70">
          Tocá una celda o una persona para filtrar el detalle
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[30rem] text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground/70">
              <th className="px-3 py-2 text-left font-normal">persona</th>
              {angulos.map((a) => (
                <th key={a} className="px-2 py-2 text-center font-normal">{a}</th>
              ))}
              <th className="px-3 py-2 text-right font-normal">dolores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matriz.map((m) => {
              const filaActiva = sel?.persona === m.persona && sel.angulo === null;
              return (
                <tr key={m.persona} className={sel?.persona === m.persona ? "bg-muted/40" : undefined}>
                  <td className="whitespace-nowrap px-3 py-2">
                    {m.total > 0 ? (
                      <button
                        type="button"
                        onClick={() => alternar(m.persona, null)}
                        aria-pressed={filaActiva}
                        className={`rounded px-1 py-0.5 text-left transition-colors hover:bg-muted ${
                          filaActiva ? "font-medium underline decoration-primary" : ""
                        }`}
                      >
                        {m.persona}
                      </button>
                    ) : (
                      <span className="px-1 text-muted-foreground">{m.persona}</span>
                    )}
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{m.publico}</span>
                  </td>
                  {angulos.map((a) => (
                    <Celda
                      key={a}
                      n={m.porAngulo[a] ?? 0}
                      activa={sel?.persona === m.persona && sel?.angulo === a}
                      onClick={() => alternar(m.persona, a)}
                    />
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-muted-foreground">
                    {m.dolores.length === 0
                      ? "sin dolores declarados"
                      : `${m.cubiertos}/${m.dolores.length}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 mb-2 flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Detalle · {rotulo}
        </div>
        {sel && (
          <button
            type="button"
            onClick={() => setSel(null)}
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            quitar el recorte ({visibles.length})
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>creativo</TableHead>
              <TableHead>dolor</TableHead>
              <TableHead>formato</TableHead>
              <TableHead>ángulo</TableHead>
              <TableHead>ronda</TableHead>
              <TableHead>estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detalle.map((c) => (
              <TableRow key={c.relPath}>
                <TableCell className="max-w-[22rem]">
                  {/* NO es un link: un creativo no tiene página propia, y no la
                      tiene a propósito. La ruta es lo que sirve para abrirlo en
                      Obsidian, que es donde se edita. */}
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.relPath}</div>
                </TableCell>
                <TableCell className="text-[12px]">
                  {c.dolor ?? <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="text-[12px]">
                  {c.formato ?? <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="text-[12px]">
                  {/* El crudo conserva el calificativo que la matriz agrupa:
                      `Educativo (pregunta)` colapsa a `Educativo` para contar,
                      pero acá se muestra lo que el vault escribió. */}
                  {c.anguloRaw ?? c.angulo ?? <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-[12px] tabular-nums">
                  {c.ronda ?? <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {c.estado ? (
                    <Badge variant="outline">{c.estado}</Badge>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/40">—</span>
                  )}
                  {c.derivadas.length > 0 && (
                    <span
                      className="ml-1.5 text-[11px] text-muted-foreground"
                      title={`Dimensiones deducidas de la ubicación: ${c.derivadas.join(", ")}. Se rompen si el archivo se mueve.`}
                    >
                      deducido
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {detalle.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            {sel
              ? "Ningún creativo de esa celda pasa los filtros."
              : "Ningún creativo pasa estos filtros."}
          </p>
        )}
      </div>
    </>
  );
}
