import Link from "next/link";

// EL 404, y una pista que solo existe en desarrollo.
//
// `/configuracion` no existe sin GROWTH_CONSOLE=1: su archivo se llama
// `page.local.tsx` y esa extensión no entra en `pageExtensions` sin la variable.
// Eso es correcto, pero un 404 pelado no dice por qué, y es fácil perder diez
// minutos pensando que algo se rompió.
//
// `/operar` ya no existe con NINGUNA variable: la consola se quitó al volver la
// plataforma un visualizador que se deploya. Ofrecerla acá mandaría a alguien a
// buscar un comando que no la trae.
//
// La pista va guardada detrás de `NODE_ENV === 'development'`. Next reemplaza
// esa comparación en tiempo de build, así que en un build de producción —el que
// se comparte— la rama entera se elimina y el texto no queda ni en el bundle.
// Es la misma regla de siempre: no alcanza con no mostrarlo, tiene que no estar.
const EN_DESARROLLO = process.env.NODE_ENV === "development";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[42rem] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        La dirección no corresponde a ninguna vista de este build.
      </p>

      {EN_DESARROLLO && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <h2 className="text-[13px] font-medium">¿Buscabas la configuración?</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            <code>/configuracion</code> <strong>no existe</strong> en un build normal: no
            está escondida, no se compila. Edita credenciales y escribe la config del
            repo, así que no puede estar en algo que se comparte. <code>/operar</code> no
            existe más en ningún build.
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
