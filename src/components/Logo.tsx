import { cn } from "@/lib/utils";

/**
 * La marca: un lazo abierto que sube y vuelve a entrar.
 *
 * Reemplaza a un `◆` suelto que no significaba nada. El dibujo es el producto:
 * un ciclo que no cierra plano sino más arriba que donde empezó — captar,
 * publicar, medir, aprender, y volver a entrar con lo aprendido.
 *
 * Trazo y no relleno, y `currentColor`: hereda el color del texto que lo
 * acompaña, así que sirve igual en el nav, en un encabezado o invertido.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn("size-[1.1em] shrink-0", className)}
    >
      {/* El lazo: arranca abajo a la izquierda, da la vuelta y sale hacia arriba. */}
      <path
        d="M4.2 13.8a5 5 0 1 1 7.3 1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* El tramo que sube: la vuelta termina más arriba de donde entró. */}
      <path
        d="M11.2 10.4 15.6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* La punta, que marca la dirección del ciclo. */}
      <path
        d="M11.9 5.6h4.2v4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-[15px] font-semibold tracking-tight", className)}>
      <LogoMark className="text-primary" />
      Growth Loop
    </span>
  );
}
