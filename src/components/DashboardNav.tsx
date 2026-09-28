"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette, { type Comando } from "./CommandPalette";
import Logo from "./Logo";
import SesionControles from "./SesionControles";

const nav = [
  { sub: "", label: "Overview" },
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
  comandos,
  accionesLocales,
  configHref = null,
}: {
  account: string;
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
  /** La ruta de Configuración, o null si no está compilada. Ver SesionControles. */
  configHref?: string | null;
}) {
  const pathname = usePathname();
  const base = `/${account}`;
  const [abierto, setAbierto] = useState(false);

  // Y con el panel abierto el fondo no scrollea: en un teléfono el scroll se lo
  // queda lo que está DEBAJO del overlay, y el panel parece trabado.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  return (
    <>
      <CommandPalette comandos={comandos} />

      {/* LA BARRA DE MOBILE. Abajo de `md` el panel lateral está oculto, y hasta
          el 2026-09-26 no había NADA en su lugar: en un teléfono no se podía
          llegar a ninguna vista sin tipear la URL. */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir la navegación"
          aria-expanded={abierto}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary"
        >
          Menú
        </button>
      </header>

      {/* El fondo oscurecido. Es un botón y no un div con onClick: tocar afuera
          para cerrar tiene que funcionar también con teclado y con lector. */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar la navegación"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Al navegar se cierra, y se hace acá y no en un efecto sobre `pathname`:
          un setState sincrónico dentro de un efecto dispara un render en cascada
          y el compilador lo marca como error.

          Se delega en el `<aside>` y se filtra por `closest('a')` para que cierre
          con CUALQUIER link —incluidos los del selector de marca, que este
          componente no renderiza— sin tocar los botones: el desplegable de marca
          y el menú de sesión abren su propio panel y cerrar el cajón al tocarlos
          los volvería inusables. */}
      <aside
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col gap-1 overflow-y-auto border-r border-border bg-background px-4 py-6 transition-transform duration-200 md:z-auto md:w-[220px] md:translate-x-0 md:transition-none ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* En mobile el logo ya está en la barra de arriba; repetirlo acá deja el
          panel abriendo con dos. */}
      <div className="hidden px-2.5 pb-5 md:block">
        <Logo />
      </div>

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

        {/* La sesión al pie. El texto que la acompañaba —"la verdad son los .md
            del vault"— decía algo cierto en un lugar donde nadie lo leía dos
            veces; vive en docs/metodo.md, que es donde se va a buscar. */}
        <div className="flex items-center border-t border-border pt-3">
          <SesionControles conDatos configHref={configHref} />
        </div>
      </div>
      </aside>
    </>
  );
}
