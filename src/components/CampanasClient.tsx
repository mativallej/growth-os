"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

export type PersonaFila = {
  persona: string;
  publico?: string;
  /** Cuántos dolores declara el framework para esta persona. */
  dolores: number;
  /** De esos, cuántos tienen al menos un creativo. */
  cubiertos: number;
  /** Creativos por ángulo. Las claves son los ángulos de `angulos`. */
  porAngulo: Record<string, number>;
  total: number;
};

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
  filas,
  angulos,
  creativos,
}: {
  filas: PersonaFila[];
  angulos: string[];
  creativos: CreativoRow[];
}) {
  const [sel, setSel] = useState<Seleccion>(null);

  // Clickear lo ya seleccionado deselecciona. Sin eso el único modo de volver a
  // ver todo es el botón de limpiar, y la celda encendida queda como una trampa.
  const alternar = (persona: string, angulo: string | null) =>
    setSel((s) =>
      s && s.persona === persona && s.angulo === angulo ? null : { persona, angulo },
    );

  const visibles = sel
    ? creativos.filter(
        (c) => c.persona === sel.persona && (sel.angulo === null || c.angulo === sel.angulo),
      )
    : creativos;

  const rotulo = sel
    ? `${sel.persona}${sel.angulo ? ` · ${sel.angulo}` : ""}`
    : "todos los creativos";

  return (
    <>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Cobertura por persona × ángulo
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
                <th key={a} className="px-2 py-2 text-center font-normal">
                  {a}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-normal">dolores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.map((f) => {
              const filaActiva = sel?.persona === f.persona && sel.angulo === null;
              return (
                <tr
                  key={f.persona}
                  className={sel?.persona === f.persona ? "bg-muted/40" : undefined}
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    {f.total > 0 ? (
                      <button
                        type="button"
                        onClick={() => alternar(f.persona, null)}
                        aria-pressed={filaActiva}
                        className={`rounded px-1 py-0.5 text-left transition-colors hover:bg-muted ${
                          filaActiva ? "font-medium underline decoration-primary" : ""
                        }`}
                      >
                        {f.persona}
                      </button>
                    ) : (
                      <span className="px-1 text-muted-foreground">{f.persona}</span>
                    )}
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      {f.publico}
                    </span>
                  </td>
                  {angulos.map((a) => (
                    <Celda
                      key={a}
                      n={f.porAngulo[a] ?? 0}
                      activa={sel?.persona === f.persona && sel.angulo === a}
                      onClick={() => alternar(f.persona, a)}
                    />
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-muted-foreground">
                    {f.dolores === 0 ? "sin dolores declarados" : `${f.cubiertos}/${f.dolores}`}
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
            ver todos ({creativos.length})
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
            {visibles.map((c) => (
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
        {visibles.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            Esta persona no tiene creativos con ese ángulo.
          </p>
        )}
      </div>
    </>
  );
}
