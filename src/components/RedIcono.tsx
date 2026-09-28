'use client';

import { SiInstagram, SiMeta, SiReddit, SiX, SiYoutube } from 'react-icons/si';
// LinkedIn sale de Font Awesome y no de Simple Icons: Simple Icons lo sacó de su
// set por la política de marca de LinkedIn, así que `SiLinkedin` no existe.
import { FaLinkedinIn } from 'react-icons/fa6';
import { cn } from '@/lib/utils';

/**
 * El logo de la red, en lugar de su nombre.
 *
 * La columna decía `instagram`, `x`, `linkedin` — once caracteres para un dato
 * que se reconoce de un vistazo, en una tabla donde el ancho se lo tiene que
 * llevar el título de la pieza. Con el icono la columna pasa de 6rem a 2rem.
 *
 * NO SE PIERDE EL NOMBRE: va en el `title` y en el `aria-label`, así que sigue
 * estando para un lector de pantalla y para quien pase el mouse. Un icono sin
 * texto accesible es un dato que desaparece para quien no ve.
 *
 * SIN MAPA POR DEFECTO A UN ICONO GENÉRICO ELEGIDO AL AZAR: un canal que este
 * archivo no conoce muestra su nombre, tal cual. Dibujarle un globo terráqueo
 * diría "es una red" sobre algo que puede ser un blog o un canal que todavía no
 * está mapeado, y esconder que falta mapearlo.
 */

const ICONOS: Record<string, { Icono: React.ComponentType<{ className?: string }>; label: string }> = {
  x: { Icono: SiX, label: 'X' },
  twitter: { Icono: SiX, label: 'X' },
  instagram: { Icono: SiInstagram, label: 'Instagram' },
  linkedin: { Icono: FaLinkedinIn, label: 'LinkedIn' },
  reddit: { Icono: SiReddit, label: 'Reddit' },
  youtube: { Icono: SiYoutube, label: 'YouTube' },
  'meta-ads': { Icono: SiMeta, label: 'Meta Ads' },
};

export function RedIcono({ canal, className }: { canal: string; className?: string }) {
  const e = ICONOS[canal.toLowerCase()];

  if (!e) {
    // Un canal sin icono se escribe. `blog` y `cross-post` caen acá y está bien:
    // no son redes con logo, son lugares donde el vault publica.
    return (
      <span className={cn('text-[12px] text-muted-foreground', className)} title={canal}>
        {canal || '—'}
      </span>
    );
  }

  const { Icono, label } = e;
  return (
    <span title={label} aria-label={label} role="img" className="inline-flex">
      <Icono className={cn('size-3.5 text-muted-foreground', className)} />
    </span>
  );
}
