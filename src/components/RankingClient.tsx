"use client";

import Link from "next/link";
import { useState } from "react";

export type RankEntry = {
  title: string;
  href: string;
  channel: string;
  value: string;
  rate: string;
};
export type RankGroup = { metric: string; label: string; rows: RankEntry[] };

/**
 * El toggle vive en el cliente sobre datos YA CALCULADOS en el servidor.
 *
 * La alternativa era leer la métrica de la query string, pero eso vuelve la
 * página dinámica y la saca del build estático — que es lo que sostiene el
 * aislamiento entre marcas. Los cinco rankings juntos son unas pocas decenas de
 * filas: mandarlos es más barato que renderizar bajo demanda.
 */
export default function RankingClient({ groups }: { groups: RankGroup[] }) {
  const [activa, setActiva] = useState(groups[0]?.metric ?? "");
  const grupo = groups.find((g) => g.metric === activa) ?? groups[0];

  if (!grupo) return null;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {groups.map((g) => (
          <button
            key={g.metric}
            type="button"
            onClick={() => setActiva(g.metric)}
            aria-pressed={g.metric === activa}
            className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
              g.metric === activa
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.label}
            <span className="ml-1.5 tabular-nums opacity-60">{g.rows.length}</span>
          </button>
        ))}
      </div>

      {grupo.rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Ninguna pieza tiene <strong>{grupo.label.toLowerCase()}</strong> medido. No se
          listan en cero: un cero es una posición y &ldquo;no medido&rdquo; no lo es.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          <div className="flex items-baseline gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground/70">
            <span className="w-6 shrink-0" />
            <span className="flex-1">pieza</span>
            <span className="w-20 shrink-0 text-right">{grupo.label.toLowerCase()}</span>
            <span className="w-20 shrink-0 text-right">/ alcance</span>
          </div>
          {grupo.rows.map((r, i) => (
            <div key={r.href} className="flex items-baseline gap-3 px-4 py-2.5 text-[13px]">
              <span className="w-6 shrink-0 tabular-nums text-muted-foreground/60">{i + 1}</span>
              <Link href={r.href} className="flex-1 truncate hover:underline">
                {r.title}
                <span className="ml-2 text-muted-foreground">{r.channel}</span>
              </Link>
              <span className="w-20 shrink-0 text-right font-medium tabular-nums">{r.value}</span>
              <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">{r.rate}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
