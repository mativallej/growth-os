// Lista de barras horizontales. El markup estaba duplicado dos veces en la
// vista de overview y lo necesitan las cuatro vistas del change siguiente.
//
// Escala al máximo de la lista, no a un total: lo que se compara es el orden y
// la distancia entre categorías. Una lista vacía no dibuja una barra en cero
// —eso parecería un valor medido— sino que dice que no hay nada (regla dura 5).

export type BarItem = { label: string; value: number };

export function withBars(items: BarItem[]): (BarItem & { pct: number })[] {
  const max = Math.max(...items.map((i) => i.value), 1);
  return items.map((i) => ({ ...i, pct: (i.value / max) * 100 }));
}

export default function BarList({
  items,
  labelClassName = "w-28",
  empty = "sin datos",
}: {
  items: BarItem[];
  labelClassName?: string;
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-muted-foreground/70">{empty}</p>;
  }
  return (
    <div className="space-y-2.5">
      {withBars(items).map((it) => (
        <div key={it.label} className="flex items-center gap-3 text-[13px]">
          <span className={`${labelClassName} shrink-0 truncate text-muted-foreground`}>{it.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${it.pct}%` }} />
          </div>
          <span className="w-8 text-right tabular-nums text-muted-foreground">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
