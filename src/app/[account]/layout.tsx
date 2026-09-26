import { notFound } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import type { Comando } from "@/components/CommandPalette";
import { findSource, listSources } from "@/lib/sources";
import { loadPieces } from "@/lib/parse";

const VISTAS = [
  { sub: "", label: "Overview" },
  { sub: "piezas", label: "Piezas" },
  { sub: "inventario", label: "Inventario" },
  { sub: "cadencia", label: "Cadencia" },
  { sub: "deuda", label: "Deuda" },
  { sub: "formulas", label: "Fórmulas" },
  { sub: "ranking", label: "Ranking" },
  { sub: "campanas", label: "Campañas" },
];

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
  const source = findSource(account, sources);
  if (!source) notFound();

  // El índice del ⌘K: título, canal y ruta. NO lleva el cuerpo de ninguna pieza
  // —no hay motivo para mandar texto completo a un buscador— y es solo de la
  // marca que se está mirando, así que no cruza la frontera entre marcas.
  const comandos: Comando[] = [
    ...VISTAS.map((v) => ({
      id: `vista:${v.sub}`,
      titulo: v.label,
      href: v.sub ? `/${account}/${v.sub}` : `/${account}`,
      grupo: "Ir a",
    })),
    ...sources
      .filter((s) => s.id !== account)
      .map((s) => ({
        id: `marca:${s.id}`,
        titulo: s.label,
        detalle: "cambiar de marca",
        href: `/${s.id}`,
        grupo: "Marcas",
      })),
    ...loadPieces([source]).map((p) => ({
      id: `pieza:${p.slug}`,
      titulo: p.title,
      detalle: p.channel,
      href: `/${account}/piezas/${p.slug}`,
      grupo: "Piezas",
    })),
  ];

  return (
    <>
      <DashboardNav
        account={account}
        accounts={sources.map((s) => ({ id: s.id, label: s.label }))}
        comandos={comandos}
        local={process.env.GROWTH_CONSOLE === "1"}
      />
      <main className="max-w-[1080px] px-6 py-9 md:ml-[220px] md:px-10">{children}</main>
    </>
  );
}
