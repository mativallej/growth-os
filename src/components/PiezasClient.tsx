"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type PiezaCard = {
  title: string;
  /** Ruta completa a la pieza, ya con el segmento de marca adelante. */
  href: string;
  canal: string;
  meta: string;
  verdict: string;
  formula: string;
  chartHtml: string;
  stats: { k: string; v: string; good?: boolean }[];
};

const verdictVariant = (v: string): "success" | "destructive" | "secondary" => {
  const s = v.toLowerCase();
  if (["breakout", "strong", "solid"].includes(s)) return "success";
  if (["weak", "flop"].includes(s)) return "destructive";
  return "secondary";
};

const btnBase = "rounded-md border border-border px-3 py-1.5 text-xs transition-colors";

export default function PiezasClient({ cards, nets }: { cards: PiezaCard[]; nets: string[] }) {
  const [net, setNet] = useState("");
  const shown = cards.filter((c) => !net || c.canal === net);
  const filters = [{ label: "Todas", value: "" }, ...nets.map((n) => ({ label: n, value: n }))];

  return (
    <>
      {nets.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((b) => (
            <button
              key={b.value}
              onClick={() => setNet(b.value)}
              className={`${btnBase} ${
                net === b.value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {cards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Ninguna pieza tiene métricas cargadas todavía.
        </p>
      )}

      <div>
        {shown.map((c) => (
          <Card key={c.href} className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={c.href} className="text-[17px] font-semibold tracking-tight hover:underline">
                    {c.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.meta}</div>
                </div>
                <div className="flex items-center gap-2">
                  {c.verdict && <Badge variant={verdictVariant(c.verdict)}>{c.verdict}</Badge>}
                  {c.formula && <Badge variant="outline">{c.formula}</Badge>}
                </div>
              </div>

              <div
                className="mt-5 rounded-lg border border-border p-3"
                dangerouslySetInnerHTML={{ __html: c.chartHtml }}
              />

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {c.stats.map((d) => (
                  <div key={d.k}>
                    <div className="text-[11px] text-muted-foreground">{d.k}</div>
                    <div className={`mt-1 text-base font-semibold tabular-nums ${d.good ? "text-[var(--tg-green)]" : ""}`}>
                      {d.v}
                    </div>
                  </div>
                ))}
              </div>

              <Link href={c.href} className="mt-5 inline-block text-xs text-primary hover:underline">
                Ver detalle →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
