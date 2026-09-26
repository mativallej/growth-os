"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountSwitcher, { type AccountOption } from "./AccountSwitcher";
import Logo from "./Logo";

const nav = [
  { sub: "", label: "Overview" },
  { sub: "piezas", label: "Piezas" },
  { sub: "inventario", label: "Inventario" },
  // Lo que Notion no puede dar: series y catálogo.
  { sub: "cadencia", label: "Cadencia" },
  { sub: "deuda", label: "Deuda" },
  { sub: "formulas", label: "Fórmulas" },
  { sub: "ranking", label: "Ranking" },
];

/**
 * La navegación cuelga de la cuenta activa. Recibe todo por props: los textos
 * de una marca no se hardcodean acá, porque este mismo componente se renderiza
 * dentro de las dos y en un build que puede tener una sola.
 */
export default function DashboardNav({
  account,
  accounts,
}: {
  account: string;
  accounts: AccountOption[];
}) {
  const pathname = usePathname();
  const base = `/${account}`;
  const actual = accounts.find((a) => a.id === account);

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col gap-1 border-r border-border px-4 py-6 md:flex">
      <div className="px-2.5 pb-5">
        <Logo />
      </div>

      <AccountSwitcher accounts={accounts} current={account} />

      {nav.map((n) => {
        const href = n.sub ? `${base}/${n.sub}` : base;
        const active = n.sub ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-2.5 py-2 text-sm transition-colors ${
              active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {n.label}
          </Link>
        );
      })}

      <div className="mt-auto border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/70">
        {actual?.label ?? account} · lee los <code>.md</code> del vault · sin API
      </div>
    </aside>
  );
}
