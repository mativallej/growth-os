'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';

/**
 * La casilla, sobre Radix.
 *
 * Reemplaza a un `<input type="checkbox">` pelado, que en macOS mide 13px y se
 * pinta con el color del sistema: al lado de la estrella de favorito quedaban dos
 * controles de tamaños distintos y ninguno cómodo de tocar en un teléfono.
 *
 * Radix la dibuja como un `<button role="checkbox">`, así que el tamaño y el
 * color son nuestros, y trae el estado indeterminado y el manejo de teclado.
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-4 shrink-0 rounded-[4px] border border-border ring-offset-background transition-colors',
      'hover:border-foreground/40',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-30',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <svg viewBox="0 0 14 14" aria-hidden="true" className="size-3">
        <path
          d="M2.5 7.5 5.5 10.5 11.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';
