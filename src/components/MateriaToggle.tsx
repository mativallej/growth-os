"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Materia } from "@/lib/unidades";

/**
 * Orgánico o ads. CAMBIA EL CONJUNTO, no filtra uno mezclado.
 *
 * Son dos cosas distintas: un creativo no tiene fórmula, y rankearlo por alcance
 * es rankearlo por cuánto se gastó. Ofrecer "las dos juntas" las volvería
 * comparables, que es justo lo que no son — y las columnas que tienen sentido
 * para una no la tienen para la otra.
 *
 * Si la marca no tiene creativos, la pestaña no se ofrece: un tablero vacío que
 * se puede abrir invita a pensar que algo se rompió.
 */
export default function MateriaToggle({
  valor,
  onChange,
  conteos,
}: {
  valor: Materia;
  onChange: (m: Materia) => void;
  conteos: { organico: number; ads: number };
}) {
  if (conteos.ads === 0) return null;
  return (
    <ToggleGroup
      type="single"
      value={valor}
      onValueChange={(v) => v && onChange(v as Materia)}
      className="mb-3"
    >
      <ToggleGroupItem value="organico" aria-label="Contenido orgánico">
        Orgánico
        <span className="ml-1.5 tabular-nums opacity-60">{conteos.organico}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="ads" aria-label="Creativos de campañas">
        Ads
        <span className="ml-1.5 tabular-nums opacity-60">{conteos.ads}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
