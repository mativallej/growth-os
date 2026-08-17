"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" },
  { href: "/piezas", label: "Piezas", match: (p: string) => p.startsWith("/piezas") },
  { href: "/inventario", label: "Inventario", match: (p: string) => p.startsWith("/inventario") },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col gap-1 border-r border-border px-4 py-6 md:flex">
      <div className="px-2.5 pb-6 text-[15px] font-semibold tracking-tight">
        <span className="text-primary">◆</span> X Analytics
      </div>
      {nav.map((n) => {
        const active = n.match(pathname);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-md px-2.5 py-2 text-sm transition-colors ${
              active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/70">
        Fase 1 · lee <code>Brand/Content</code> · sin API
      </div>
    </aside>
  );
}
