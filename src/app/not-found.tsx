import Link from "next/link";

// EL 404, y una pista que solo existe en desarrollo.
//
// `/operar` y `/configuracion` no existen sin GROWTH_CONSOLE=1: sus archivos se
// llaman `page.local.tsx` y esa extensión no entra en `pageExtensions` sin la
// variable. Eso es correcto, pero un 404 pelado no dice por qué, y es fácil
// perder diez minutos pensando que algo se rompió.
//
// La pista va guardada detrás de `NODE_ENV === 'development'`. Next reemplaza
// esa comparación en tiempo de build, así que en un build de producción —el que
// se comparte— la rama entera se elimina y el texto no queda ni en el bundle.
// Es la misma regla de siempre: no alcanza con no mostrarlo, tiene que no estar.
const EN_DESARROLLO = process.env.NODE_ENV === "development";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[42rem] px-6 py-20">
      <h1 className="text-xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        La dirección no corresponde a ninguna vista de este build.
      </p>

      {EN_DESARROLLO && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <h2 className="text-[13px] font-medium">¿Buscabas la consola o la configuración?</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            <code>/operar</code> y <code>/configuracion</code> <strong>no existen</strong> en
            un build normal: no están escondidas, no se compilan. Son operaciones que
            escriben y credenciales que se editan, así que no pueden estar en algo que se
            comparte.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-secondary px-3 py-2 text-[12px]">
            npm run dev:local
          </pre>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
            Hay que <strong>reiniciar el servidor</strong>: la variable se lee al cargar la
            config, así que ponerla con el server ya levantado no cambia nada.
          </p>
        </div>
      )}

      <p className="mt-6 text-[13px]">
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
