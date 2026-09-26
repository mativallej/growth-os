'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Desplegable simple, sobre `<details>`.
 *
 * Sin librería: con n marcas la pantalla de configuración crece sin techo, y lo
 * que hace falta es poder colapsar una sección — no un componente con
 * animaciones. `<details>` ya es accesible y funciona sin JS.
 */
export function Desplegable({
  titulo,
  detalle,
  acciones,
  abiertoPorDefecto,
  children,
  className,
}: {
  titulo: React.ReactNode;
  detalle?: React.ReactNode;
  /** Se muestra a la derecha del título, dentro del resumen. */
  acciones?: React.ReactNode;
  abiertoPorDefecto?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details
      open={abiertoPorDefecto}
      className={cn('group overflow-hidden rounded-lg border border-border', className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 marker:content-[''] hover:bg-secondary [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        >
          <path d="M4.5 2 8.5 6 4.5 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{titulo}</div>
          {detalle && (
            <div className="mt-0.5 break-all text-[11px] text-muted-foreground">{detalle}</div>
          )}
        </div>
        {acciones && <div className="shrink-0">{acciones}</div>}
      </summary>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}
