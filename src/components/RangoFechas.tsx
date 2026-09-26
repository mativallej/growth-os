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

const ATAJOS = [
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "12m", dias: 365 },
];

export default function RangoFechas({
  valor,
  onChange,
}: {
  valor: Rango;
  onChange: (r: Rango) => void;
}) {
  const activo = Boolean(valor.desde || valor.hasta);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ATAJOS.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          onClick={() => onChange({ desde: haceDias(a.dias), hasta: HOY() })}
        >
          {a.label}
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
