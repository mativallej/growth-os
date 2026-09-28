'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

/**
 * Un panel que entra desde abajo, sobre Radix Dialog.
 *
 * POR QUÉ RADIX Y NO EL DRAWER DE SHADCN. El drawer de shadcn viene en dos
 * sabores: `vaul` y Base UI. Cualquiera de los dos suma una familia de
 * componentes entera al lado de la que este repo ya usa —select, popover, tabs,
 * tooltip, dropdown, todos Radix— y duplica primitivas que ya están. Radix Dialog
 * trae lo que un drawer necesita de verdad: foco atrapado, cierre con Escape,
 * scroll bloqueado, `aria-modal`, y el contenido fuera del flujo. Lo que no trae
 * es arrastrar para cerrar, que en un panel de comparación no hace falta.
 *
 * DE ABAJO Y NO DE COSTADO: lo que se compara son columnas, una por pieza. Un
 * panel lateral las estrangula en un teléfono justo cuando más importa que entren
 * dos al lado de la otra.
 */

export function Drawer({
  abierto,
  onAbierto,
  titulo,
  detalle,
  acciones,
  children,
}: {
  abierto: boolean;
  onAbierto: (v: boolean) => void;
  titulo: React.ReactNode;
  detalle?: React.ReactNode;
  /** Botones del encabezado, a la derecha. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={onAbierto}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-xl border-t border-border bg-background shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          )}
        >
          {/* El agarre. No arrastra —no hay gesto— pero dice de dónde salió el
              panel y hacia dónde se va, que es la mitad del trabajo del gesto. */}
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />

          <div className="flex items-start gap-3 px-4 pb-3 pt-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-medium">{titulo}</Dialog.Title>
              {detalle && (
                <Dialog.Description className="mt-0.5 text-[12px] text-muted-foreground">
                  {detalle}
                </Dialog.Description>
              )}
            </div>
            {acciones}
            <Dialog.Close
              className="shrink-0 rounded-md border border-border px-2 py-1 text-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Cerrar"
            >
              Cerrar
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-auto border-t border-border px-4 py-4 sm:px-6">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
