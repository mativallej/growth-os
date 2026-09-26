import PageHeader from '@/components/PageHeader';
import { diasEnCola, pendientes } from '@/lib/ideas-queue';
import { MARCAS, OPERACIONES } from '@/lib/operations';
import Consola from './Consola.local';
import { aVista } from './vista.local';

// La consola.
//
// Esta ruta solo existe cuando GROWTH_CONSOLE=1 (ver next.config.ts): el archivo se
// llama `page.local.tsx` y esa extensión no está en `pageExtensions` fuera del
// entorno local. No es un `display:none` — sin la variable no hay ruta.
//
// Render puro: leer el catálogo, evaluar precondiciones y mirar la cola. NINGUNA
// operación se dispara al navegar ni al recargar. Los efectos viven en
// `actions.local.ts`, que solo se invocan por POST desde un formulario.

export const dynamic = 'force-dynamic';

export default function OperarPage() {
  const operaciones = OPERACIONES.map(aVista);
  const ideas = pendientes().map((i) => ({
    id: i.id,
    texto: i.texto,
    marca: i.marca,
    dias: diasEnCola(i),
  }));

  return (
    <>
      <PageHeader
        title="Operar"
        subtitle="La app prepara, una sesión local ejecuta, una persona aprueba. Nada corre solo."
      />
      <Consola operaciones={operaciones} ideas={ideas} marcas={MARCAS} />
    </>
  );
}
