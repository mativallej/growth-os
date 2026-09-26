import { notFound } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { findSource, listSources } from "@/lib/sources";

/**
 * Una ruta por marca. El segmento NO es cosmético: es la frontera de privacidad
 * del proyecto (regla dura 4).
 *
 * Con la marca en la ruta, cada página carga SOLO su fuente, así que el payload
 * RSC de una vista de Tegu nunca contiene el `body` de una pieza personal. La
 * alternativa barata —cargar todo y filtrar en el cliente— mandaría la historia
 * del despido, en texto plano, dentro de una página que se le comparte al socio.
 *
 * Y compone con el recorte: en un build con `GROWTH_SOURCES=tegu`,
 * `generateStaticParams` no emite `/personal`, y `findSource` la rechaza. La
 * ruta no existe; no está escondida.
 */
/**
 * NADA FUERA DE LO GENERADO. Es la mitad estructural del aislamiento, y sin
 * esto el resto no alcanza.
 *
 * Por default Next renderiza bajo demanda un param que `generateStaticParams`
 * no devolvió. Con `GROWTH_SOURCES=tegu` eso significaba que `/personal/piezas`
 * daba 200 y servía el vault personal leído en el momento — el build no la
 * emitía, pero el servidor la fabricaba igual. Verificado el 2026-09-26 contra
 * `next start`: devolvía las sondas del contenido personal.
 *
 * En `false`, una marca que no entró al build es un 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return listSources().map((s) => ({ account: s.id }));
}

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  const sources = listSources();
  if (!findSource(account, sources)) notFound();

  return (
    <>
      <DashboardNav
        account={account}
        accounts={sources.map((s) => ({ id: s.id, label: s.label }))}
      />
      <main className="max-w-[1080px] px-6 py-9 md:ml-[220px] md:px-10">{children}</main>
    </>
  );
}
