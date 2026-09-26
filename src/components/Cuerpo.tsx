import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * El cuerpo de una pieza, renderizado como Markdown.
 *
 * Antes era `whitespace-pre-wrap` sobre el texto crudo, así que se veían los
 * `##`, los `**` y los backticks tal cual. Las piezas de blog son Markdown de
 * verdad —con encabezados, negritas, listas y bloques de código— y leerlas con la
 * sintaxis a la vista es exactamente lo que no tiene que pasar en una pantalla
 * que existe para mirarlas.
 *
 * SIN HTML CRUDO, y no por casualidad: `react-markdown` produce elementos de
 * React, no una cadena que se inyecta con `dangerouslySetInnerHTML`. Un `.md` con
 * un `<script>` adentro se muestra como texto. No se habilita `rehype-raw` —que
 * sí interpretaría ese HTML— porque el cuerpo de una pieza no necesita HTML y
 * habilitarlo convierte cada archivo del vault en código ejecutable.
 *
 * `remark-gfm` agrega lo que el vault usa y el Markdown base no tiene: tablas,
 * tachado y listas de tareas.
 *
 * Los enlaces abren afuera y se marcan `nofollow noreferrer`: salen de un archivo
 * de texto y pueden apuntar a cualquier lado.
 */
export default function Cuerpo({ children }: { children: string }) {
  return (
    <div className="cuerpo text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="nofollow noreferrer" className="text-primary hover:underline">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
