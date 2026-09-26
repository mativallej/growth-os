"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type AccountOption = { id: string; label: string };

/**
 * Cambia de marca preservando la subruta: de `/tegu/inventario` a
 * `/personal/inventario`, no al inicio.
 *
 * NO SE RENDERIZA SI HAY UNA SOLA FUENTE en el build. No es prolijidad: en un
 * build recortado a Tegu, un selector que nombre la marca personal filtra que
 * existe, y esa ruta ni siquiera se emitió.
 *
 * Es un dropdown y no un segmentado: con dos marcas el segmentado ya partía
 * "Marca personal" en dos líneas dentro de un sidebar de 220px, y la lista de
 * marcas crece agregando un objeto a config/sources.json — un control que se
 * rompe al tercer elemento no sirve para algo que está pensado para crecer.
 *
 * Los items son <Link> de verdad, no handlers: se pueden abrir en otra pestaña
 * y copiar la dirección. El <details> hace de menú sin JS; lo único que agrega
 * JS es cerrarlo al hacer clic afuera y con Escape.
 */
export default function AccountSwitcher({
  accounts,
  current,
}: {
  accounts: AccountOption[];
  current: string;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (accounts.length < 2) return null;

  // `/tegu/piezas/algo` -> `piezas/algo`. El primer segmento es la cuenta.
  const subruta = pathname.split("/").slice(2).join("/");
  const actual = accounts.find((a) => a.id === current);

  return (
    <details
      ref={ref}
      open={abierto}
      onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}
      className="relative mb-5"
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm marker:content-[''] hover:bg-secondary [&::-webkit-details-marker]:hidden"
        aria-label="Cambiar de marca"
      >
        <span className="truncate font-medium">{actual?.label ?? current}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`size-3 shrink-0 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-border bg-background py-1 shadow-md">
        {accounts.map((a) => {
          const activa = a.id === current;
          return (
            <Link
              key={a.id}
              href={`/${a.id}${subruta ? `/${subruta}` : ""}`}
              aria-current={activa ? "page" : undefined}
              onClick={() => setAbierto(false)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary ${
                activa ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="truncate">{a.label}</span>
              {activa && <span aria-hidden="true" className="text-xs">✓</span>}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
