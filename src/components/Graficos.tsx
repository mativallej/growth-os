"use client";

import { useState } from "react";

// Marcas finas, ejes recesivos, etiquetas selectivas. Sin librería: son tres
// formas, y traerse una dependencia de gráficos para esto pesa más que el
// gráfico.
//
// Ninguna de las tres dibuja una barra en cero cuando el dato falta: un cero es
// una medición y la ausencia no lo es (regla dura 5). Lo ausente se dice con
// palabras.

const fmt = (n: number) => n.toLocaleString("es-AR");

/**
 * Barras por período, con la banda del objetivo si lo hay.
 *
 * Vertical y no horizontal porque el eje es el TIEMPO: leer meses de arriba
 * hacia abajo obliga a rotar la cabeza para ver una tendencia que es, por
 * definición, de izquierda a derecha.
 */
export function BarrasPorMes({
  datos,
  piso,
  techo,
  alto = 120,
}: {
  datos: { label: string; value: number }[];
  piso?: number;
  techo?: number;
  alto?: number;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  if (datos.length === 0) return null;

  const max = Math.max(...datos.map((d) => d.value), techo ?? 0, 1);
  const escala = (v: number) => (v / max) * alto;

  return (
    <div>
      <div className="relative flex items-end gap-1" style={{ height: alto }}>
        {/* La banda del objetivo va atrás de las barras, no adelante: es
            referencia, no dato. */}
        {piso !== undefined && techo !== undefined && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-y border-dashed border-muted-foreground/25 bg-muted-foreground/[0.04]"
            style={{ bottom: escala(piso), height: escala(techo) - escala(piso) }}
          />
        )}

        {datos.map((d, i) => {
          const bajo = piso !== undefined && d.value < piso;
          return (
            <div
              key={d.label}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: alto }}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
            >
              {activo === i && (
                <div className="absolute -top-1 z-10 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                  {d.label}: {fmt(d.value)}
                </div>
              )}
              <div
                className={`w-full rounded-t-[3px] transition-colors ${
                  bajo ? "bg-muted-foreground/35" : "bg-primary"
                } ${activo === i ? "opacity-100" : "opacity-90"}`}
                style={{ height: Math.max(escala(d.value), d.value > 0 ? 2 : 0) }}
              />
            </div>
          );
        })}
      </div>

      {/* Solo el primero y el último: con doce meses las etiquetas se pisan y no
          se lee ninguna. El resto lo dice el hover. */}
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/70">
        <span>{datos[0].label}</span>
        {datos.length > 1 && <span>{datos[datos.length - 1].label}</span>}
      </div>
    </div>
  );
}

/**
 * Una barra partida en tramos, con su leyenda.
 *
 * Para una composición de pocas partes —cobertura de medición son tres— es más
 * legible que un donut: las proporciones se comparan sobre una línea, no sobre
 * ángulos.
 */
export function BarraCompuesta({
  tramos,
}: {
  tramos: { label: string; value: number; clase: string }[];
}) {
  const total = tramos.reduce((s, t) => s + t.value, 0);
  if (total === 0) {
    return <p className="text-[13px] text-muted-foreground/70">Nada que componer todavía.</p>;
  }
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {tramos
          .filter((t) => t.value > 0)
          .map((t) => (
            <div
              key={t.label}
              className={t.clase}
              style={{ width: `${(t.value / total) * 100}%` }}
              title={`${t.label}: ${fmt(t.value)}`}
            />
          ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {tramos.map((t) => (
          <div key={t.label} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${t.clase}`} />
            <span className="flex-1 text-muted-foreground">{t.label}</span>
            <span className="tabular-nums">{fmt(t.value)}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground/70">
              {Math.round((t.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Una sola proporción contra su total. El relleno lleva la severidad.
 * Devuelve el texto de "sin datos" en vez de una barra vacía al 0%, que se
 * leería como una medición de cero.
 */
export function Medidor({
  valor,
  total,
  etiqueta,
  invertido,
}: {
  valor: number;
  total: number;
  etiqueta: string;
  /** true cuando MÁS es peor (deuda), false cuando más es mejor (cobertura). */
  invertido?: boolean;
}) {
  if (total === 0) {
    return <p className="text-[13px] text-muted-foreground/70">Sin piezas para medir.</p>;
  }
  const pct = (valor / total) * 100;
  const bien = invertido ? pct < 25 : pct > 60;
  const mal = invertido ? pct > 60 : pct < 25;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {Math.round(pct)}%
        </span>
        <span className="text-[11px] text-muted-foreground">
          {fmt(valor)} de {fmt(total)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${
            bien
              ? "bg-[var(--tg-green)]"
              : mal
                ? "bg-[var(--tg-red)]"
                : "bg-primary"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground/70">{etiqueta}</p>
    </div>
  );
}
