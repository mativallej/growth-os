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
  accionesLocales,
}: {
  account: string;
  accounts: AccountOption[];
  comandos: Comando[];
  /**
   * Los accesos a la consola, YA CONSTRUIDOS EN EL SERVIDOR.
   *
   * No es un booleano y el nav no arma esos links: si los armara, sus rutas
   * quedarían escritas en el chunk de CLIENTE del build compartido aunque la
   * condición fuera `false` — una condición de runtime no saca el JSX del
   * bundle. Pasa como nodo: cuando el build no es local, el servidor no
   * construye nada y no hay nada que serializar.
   *
   * Es el mismo error que las notas de `operations-console` ya habían anotado, y
   * que se volvió a cometer al sumar estos accesos al nav.
   */
  accionesLocales?: React.ReactNode;
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
        {accionesLocales}

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
