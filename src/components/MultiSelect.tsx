"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Opcion = { value: string; label: string; count?: number };

/**
 * Filtro por faceta: varias opciones a la vez, no una.
 *
 * Un `select` de opción única obliga a elegir "Instagram O Twitter", cuando la
 * pregunta real casi siempre es "Instagram Y Twitter, sin Blog". Con las facetas
 * de un dashboard —red, fórmula, cobertura— la selección múltiple es el caso
 * normal y la única es la excepción.
 *
 * Sin selección = sin filtrar, no "ninguno": un filtro vacío que esconda todo
 * sería un tablero en blanco que parece un error.
 */
export default function MultiSelect({
  titulo,
  opciones,
  valor,
  onChange,
  buscable,
}: {
  titulo: string;
  opciones: Opcion[];
  valor: string[];
  onChange: (v: string[]) => void;
  /** Con muchas opciones (fórmulas) hace falta buscar; con cinco redes, no. */
  buscable?: boolean;
}) {
  const [q, setQ] = useState("");
  if (opciones.length === 0) return null;

  const elegidas = new Set(valor);
  const alternar = (v: string) =>
    onChange(elegidas.has(v) ? valor.filter((x) => x !== v) : [...valor, v]);

  const visibles = q
    ? opciones.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : opciones;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 text-xs transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring",
          elegidas.size > 0 && "border-solid"
        )}
      >
        <span className="text-muted-foreground">+</span>
        {titulo}
        {elegidas.size > 0 && (
          <>
            <span aria-hidden="true" className="mx-0.5 h-3.5 w-px bg-border" />
            {elegidas.size <= 2 ? (
              valor.map((v) => (
                <Badge key={v} variant="secondary" className="px-1.5 py-0 text-[11px]">
                  {opciones.find((o) => o.value === v)?.label ?? v}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                {elegidas.size} elegidas
              </Badge>
            )}
          </>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0">
        {buscable && (
          <div className="border-b border-border p-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Buscar ${titulo.toLowerCase()}…`}
              className="h-7 border-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        )}

        <div className="max-h-64 overflow-y-auto p-1" role="group" aria-label={titulo}>
          {visibles.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados</p>
          ) : (
            visibles.map((o) => {
              const activa = elegidas.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="checkbox"
                  aria-checked={activa}
                  onClick={() => alternar(o.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                      activa
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {activa && (
                      <svg viewBox="0 0 10 10" className="size-2.5">
                        <path
                          d="M1.5 5 4 7.5 8.5 2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && (
                    <span className="shrink-0 tabular-nums text-muted-foreground">{o.count}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {elegidas.size > 0 && (
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full rounded-sm px-2 py-1.5 text-center text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Limpiar {titulo.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
