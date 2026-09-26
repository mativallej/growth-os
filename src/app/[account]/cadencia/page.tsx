import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import CadenciaClient, { type Mes, type PiezaDelMes } from "@/components/CadenciaClient";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { loadFormulas, formulaCodeOf } from "@/lib/formulas";
import { primaryReach } from "@/lib/metrics";
import { dietaDe } from "@/lib/cadencia";

// El mes se congela al BUILD, no al render: estas páginas son estáticas, así que
// "este mes" es cuándo se generaron. Calcularlo en el cliente haría que dependa
// del reloj de cada navegador — y dos personas verían meses en curso distintos.
const MES_EN_CURSO = new Date().toISOString().slice(0, 7);

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

  // Las piezas sin fecha NO se reparten entre los meses ni se estiman: eso daría
  // una cadencia inventada. Se cuentan aparte y la vista lo dice.
  const porMes = new Map<string, PiezaDelMes[]>();
  let sinFecha = 0;
  for (const p of publicadas) {
    if (!p.publishedAt) {
      sinFecha++;
      continue;
    }
    const mes = p.publishedAt.slice(0, 7);
    porMes.set(mes, [
      ...(porMes.get(mes) ?? []),
      {
        slug: p.slug,
        title: p.title,
        href: `/${account}/piezas/${p.slug}`,
        canal: p.channel,
        formulaCode: formulaCodeOf(p, catalogo) ?? "",
        publishedAt: p.publishedAt,
        medida: primaryReach(p) !== null,
      },
    ]);
  }

  const meses: Mes[] = [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, piezas]) => ({
      month,
      piezas: piezas.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)),
    }));

  return (
    <>
      <PageHeader title="Cadencia" />
      <CadenciaClient
        meses={meses}
        piso={piso}
        techo={techo}
        sinFecha={sinFecha}
        totalPublicadas={publicadas.length}
        mesEnCurso={MES_EN_CURSO}
      />
    </>
  );
}
