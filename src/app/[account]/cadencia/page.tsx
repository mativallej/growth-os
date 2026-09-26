import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import CadenciaClient, { type PiezaDelMes } from "@/components/CadenciaClient";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { loadFormulas, formulaCodeOf } from "@/lib/formulas";
import { primaryReach } from "@/lib/metrics";
import { dietaDe } from "@/lib/cadencia";

// La fecha se congela al BUILD, no al render: estas páginas son estáticas, así
// que "hoy" es cuándo se generaron. Calcularla en el cliente haría que dependa
// del reloj de cada navegador, y dos personas verían períodos en curso distintos.
const HOY = new Date().toISOString().slice(0, 10);

export default async function CadenciaPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  // La dieta es de la MARCA y la declara el humano: se lee de la config, no se
  // infiere del promedio de los últimos meses. Derivar el objetivo de lo que
  // viene pasando es garantizar que nunca se esté por debajo de él.
  const { piso, techo } = dietaDe(source.brand);

  const catalogo = loadFormulas().formulas;
  const publicadas = loadPieces([source]).filter((p) => p.status === "published");

  // Las piezas sin fecha NO se reparten entre los períodos ni se estiman: eso
  // daría una cadencia inventada. Se cuentan aparte y la vista lo dice.
  //
  // El AGRUPADO no se hace acá: la granularidad la elige quien mira, así que el
  // servidor manda la lista plana y la vista la corta por semana, mes, trimestre
  // o año sin volver a pedir nada.
  const piezas: PiezaDelMes[] = [];
  let sinFecha = 0;
  for (const p of publicadas) {
    if (!p.publishedAt) {
      sinFecha++;
      continue;
    }
    piezas.push({
      slug: p.slug,
      title: p.title,
      href: `/${account}/piezas/${p.slug}`,
      canal: p.channel,
      formulaCode: formulaCodeOf(p, catalogo) ?? "",
      publishedAt: p.publishedAt,
      medida: primaryReach(p) !== null,
    });
  }
  piezas.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  return (
    <>
      <PageHeader title="Cadencia" />
      <CadenciaClient
        piezas={piezas}
        piso={piso}
        techo={techo}
        sinFecha={sinFecha}
        totalPublicadas={publicadas.length}
        hoy={HOY}
      />
    </>
  );
}
