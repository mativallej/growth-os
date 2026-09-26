"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AccountOption = { id: string; label: string };

/**
 * Cambia de marca preservando la subruta: de `/tegu/inventario` a
 * `/personal/inventario`, no al inicio.
 *
 * NO SE RENDERIZA SI HAY UNA SOLA FUENTE en el build. No es una cuestión de
 * prolijidad: en un build recortado a Tegu, un selector que nombre la marca
 * personal filtra que existe, y las rutas de la otra marca ni siquiera se
 * emitieron. Un link a una página que no existe es peor que no tener selector.
 */
export default function AccountSwitcher({
  accounts,
  current,
}: {
  accounts: AccountOption[];
  current: string;
}) {
  const pathname = usePathname();
  if (accounts.length < 2) return null;

  // `/tegu/piezas/algo` -> `piezas/algo`. El primer segmento es la cuenta.
  const subruta = pathname.split("/").slice(2).join("/");

  return (
    <div
      className="mb-5 flex gap-1 rounded-lg bg-secondary p-1"
      role="group"
      aria-label="Marca"
    >
      {accounts.map((a) => {
        const activa = a.id === current;
        return (
          <Link
            key={a.id}
            href={`/${a.id}${subruta ? `/${subruta}` : ""}`}
            aria-current={activa ? "page" : undefined}
            className={`flex-1 rounded-md px-2.5 py-1.5 text-center text-xs transition-colors ${
              activa
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
