"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountSwitcher, { type AccountOption } from "./AccountSwitcher";
import CommandPalette, { type Comando } from "./CommandPalette";
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
  { sub: "campanas", label: "Campañas" },
];

/**
 * La navegación cuelga de la cuenta activa. Recibe todo por props: los textos
 * de una marca no se hardcodean acá, porque este mismo componente se renderiza
 * dentro de las dos y en un build que puede tener una sola.
 */
export default function DashboardNav({
  account,
  accounts,
  comandos,
  local = false,
}: {
  account: string;
  accounts: AccountOption[];
  comandos: Comando[];
  /**
   * Resuelto EN EL SERVIDOR. En el build compartido es `false`, así que los
   * accesos a operar y configurar no se renderizan — y las rutas tampoco
   * existen, porque sus archivos son `.local.tsx` y esa extensión no entra en
   * `pageExtensions` sin GROWTH_CONSOLE=1. No hay botón Y no hay ruta: si solo
   * faltara el botón sería un `display:none`, que es lo que el gating evita.
   */
  local?: boolean;
}) {
  const pathname = usePathname();
  const base = `/${account}`;
  const actual = accounts.find((a) => a.id === account);

  return (
    <>
      <CommandPalette comandos={comandos} />
      <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col gap-1 overflow-y-auto border-r border-border px-4 py-6 md:flex">
      <div className="px-2.5 pb-5">
        <Logo />
      </div>

      <AccountSwitcher accounts={accounts} current={account} />

      <button
        type="button"
        onClick={() =>
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
          )
        }
        className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <span>Buscar…</span>
        <kbd className="rounded border border-border px-1 font-sans text-[10px]">⌘K</kbd>
      </button>

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

      <div className="mt-auto pt-4">
        {local && (
          <div className="mb-3 border-t border-border pt-3">
            <div className="px-2.5 pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Solo local
            </div>
            <Link
              href="/operar"
              className="block rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Operar
            </Link>
            <Link
              href="/configuracion"
              className="block rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Configuración
            </Link>
          </div>
        )}

        {/* Decía "sin API", y dejó de ser cierto: hay Supabase como índice
            derivado y el puente con Notion. Lo que SÍ sigue siendo cierto —y es
            la regla que ordena todo— es que la verdad son los `.md`. */}
        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/70">
          {actual?.label ?? account} · la verdad son los <code>.md</code> del vault
        </p>
      </div>
      </aside>
    </>
  );
}
