import { notFound } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import Link from "next/link";
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
  { sub: "atribucion", label: "Atribución" },
  { sub: "metodo", label: "El método" },
  { sub: "mapa", label: "Mapa" },
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
        accionesLocales={accionesLocales()}
      />
      <main className="max-w-[1080px] px-6 py-9 md:ml-[220px] md:px-10">{children}</main>
    </>
  );
}

/**
 * Los accesos que solo existen en el entorno local.
 *
 * Se construyen ACÁ, en un componente de servidor, y no en el nav: un
 * `{local && <Link href="/operar">}` dentro de un componente de cliente deja esa
 * ruta escrita en el bundle del navegador aunque la condición sea falsa. Armarlo
 * del lado del servidor hace que, sin la variable, no exista nada que serializar.
 */
function accionesLocales() {
  if (process.env.GROWTH_CONSOLE !== "1") {
    // En desarrollo, decir POR QUÉ no están. Sin esto, la ausencia de los
    // botones es indistinguible de que algo se rompió — y la respuesta es un
    // comando distinto, no un arreglo.
    //
    // `NODE_ENV === 'development'` es falso en el build que se comparte, así que
    // este texto no se renderiza ahí nunca.
    if (process.env.NODE_ENV !== "development") return null;
    return (
      <div className="mb-3 border-t border-border pt-3">
        <div className="px-2.5 text-[10px] leading-relaxed text-muted-foreground/60">
          Operar y Configuración no están compilados.
          <br />
          <code className="text-[10px]">npm run dev:local</code>
        </div>
      </div>
    );
  }
  const items = [
    { href: "/operar", label: "Operar" },
    { href: "/configuracion", label: "Configuración" },
  ];
  return (
    <div className="mb-3 border-t border-border pt-3">
      <div className="px-2.5 pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
        Solo local
      </div>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="block rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}
