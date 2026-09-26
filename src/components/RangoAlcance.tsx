"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type RangoNum = { min: string; max: string };
export const RANGO_NUM_VACIO: RangoNum = { min: "", max: "" };

/**
 * Rango de alcance.
 *
 * Se guarda como STRING y no como número a propósito: mientras alguien escribe
 * "15000" pasa por "1", "15", "150"… y un `number` con `NaN` intermedio deja el
 * input imposible de tipear. La conversión se hace al filtrar.
 *
 * Los atajos salen de los umbrales DECLARADOS de viralidad, no de números
 * inventados: "viral" acá significa lo mismo que en el filtro de nivel, y si el
 * criterio se cambia en la config, el atajo se mueve con él.
 */
export function normalizarNum(r: RangoNum): RangoNum {
  const a = Number(r.min);
  const b = Number(r.max);
  // Se invierten solo si los dos son números y vienen al revés: es un error de
  // tipeo, y un rango vacío no es una respuesta útil.
  if (r.min && r.max && Number.isFinite(a) && Number.isFinite(b) && a > b) {
    return { min: r.max, max: r.min };
  }
  return r;
}

export default function RangoAlcance({
  valor,
  onChange,
  atajos = [],
}: {
  valor: RangoNum;
  onChange: (r: RangoNum) => void;
  /** Pisos sugeridos, de los umbrales declarados. */
  atajos?: { label: string; min: number }[];
}) {
  const activo = Boolean(valor.min || valor.max);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {atajos.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          onClick={() => onChange({ min: String(a.min), max: "" })}
          title={`Alcance desde ${a.min.toLocaleString("es-AR")}`}
        >
          {a.label}
        </Button>
      ))}
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={valor.min}
        onChange={(e) => onChange(normalizarNum({ ...valor, min: e.target.value }))}
        placeholder="alcance mín."
        className="h-8 w-[7.5rem] text-xs"
        aria-label="Alcance mínimo"
      />
      <span aria-hidden="true" className="text-xs text-muted-foreground">→</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={valor.max}
        onChange={(e) => onChange(normalizarNum({ ...valor, max: e.target.value }))}
        placeholder="máx."
        className="h-8 w-[6.5rem] text-xs"
        aria-label="Alcance máximo"
      />
      {activo && (
        <Button variant="ghost" size="sm" onClick={() => onChange(RANGO_NUM_VACIO)}>
          Todo
        </Button>
      )}
    </div>
  );
}
