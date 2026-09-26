"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Rango = { desde: string; hasta: string };
export const RANGO_VACIO: Rango = { desde: "", hasta: "" };

/**
 * Rango de fechas de publicación.
 *
 * Invierte los extremos solo si vienen al revés: si alguien pone el "hasta"
 * antes que el "desde", el rango vacío no es una respuesta útil, es un error de
 * tipeo. Se ordena y listo.
 */
export function normalizar(r: Rango): Rango {
  if (r.desde && r.hasta && r.desde > r.hasta) return { desde: r.hasta, hasta: r.desde };
  return r;
}

const HOY = () => new Date().toISOString().slice(0, 10);
const haceDias = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/**
 * Dos clases de atajo, y la diferencia importa.
 *
 * Los RODANTES (30d) cuentan hacia atrás desde hoy: "cómo vengo". Los de
 * CALENDARIO (este trim.) son el período tal cual lo nombra la gente: "cómo fue
 * el trimestre". El 10 de octubre, "90d" empieza el 12 de julio y "este trim."
 * el 1 de octubre — son preguntas distintas y las dos son legítimas.
 *
 * Los de calendario son también la respuesta a "¿cuál trimestre?": el selector de
 * arriba AGRUPA en trimestres, y esto elige uno.
 */
const RODANTES = [
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "12m", dias: 365 },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Los períodos de calendario, calculados en UTC para no correrse de día. */
function calendario(): { label: string; rango: Rango }[] {
  const h = new Date();
  const a = h.getUTCFullYear();
  const m = h.getUTCMonth();
  const t = Math.floor(m / 3);
  const rango = (desde: Date, hasta: Date): Rango => ({ desde: iso(desde), hasta: iso(hasta) });
  return [
    { label: "este mes", rango: rango(new Date(Date.UTC(a, m, 1)), h) },
    { label: "mes ant.", rango: rango(new Date(Date.UTC(a, m - 1, 1)), new Date(Date.UTC(a, m, 0))) },
    { label: "este trim.", rango: rango(new Date(Date.UTC(a, t * 3, 1)), h) },
    // El día 0 del mes siguiente es el último del anterior; evita la tabla de
    // cuántos días tiene cada mes y acierta en años bisiestos.
    { label: "trim. ant.", rango: rango(new Date(Date.UTC(a, t * 3 - 3, 1)), new Date(Date.UTC(a, t * 3, 0))) },
    { label: "este año", rango: rango(new Date(Date.UTC(a, 0, 1)), h) },
    { label: "año ant.", rango: rango(new Date(Date.UTC(a - 1, 0, 1)), new Date(Date.UTC(a - 1, 11, 31))) },
  ];
}

export default function RangoFechas({
  valor,
  onChange,
  conCalendario = false,
}: {
  valor: Rango;
  onChange: (r: Rango) => void;
  /** Suma los atajos de calendario (este trim., año ant.…). */
  conCalendario?: boolean;
}) {
  const activo = Boolean(valor.desde || valor.hasta);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {RODANTES.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          onClick={() => onChange({ desde: haceDias(a.dias), hasta: HOY() })}
          title={`Los últimos ${a.dias} días desde hoy`}
        >
          {a.label}
        </Button>
      ))}
      {conCalendario &&
        calendario().map((c) => (
          <Button
            key={c.label}
            variant="outline"
            size="sm"
            onClick={() => onChange(c.rango)}
            title={`${c.rango.desde} → ${c.rango.hasta}`}
          >
            {c.label}
          </Button>
        ))}
      <Input
        type="date"
        value={valor.desde}
        max={valor.hasta || undefined}
        onChange={(e) => onChange(normalizar({ ...valor, desde: e.target.value }))}
        className="h-8 w-[8.5rem] text-xs"
        aria-label="Desde"
      />
      <span aria-hidden="true" className="text-xs text-muted-foreground">→</span>
      <Input
        type="date"
        value={valor.hasta}
        min={valor.desde || undefined}
        onChange={(e) => onChange(normalizar({ ...valor, hasta: e.target.value }))}
        className="h-8 w-[8.5rem] text-xs"
        aria-label="Hasta"
      />
      {activo && (
        <Button variant="ghost" size="sm" onClick={() => onChange(RANGO_VACIO)}>
          Todo
        </Button>
      )}
    </div>
  );
}
