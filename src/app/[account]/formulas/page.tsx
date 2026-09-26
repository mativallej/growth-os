import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import FormulasClient, {
  type FilaFormula,
  type PiezaDeFormula,
} from "@/components/FormulasClient";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { formulaCodeOf, loadFormulas } from "@/lib/formulas";
import { num, primaryReach } from "@/lib/metrics";

/**
 * Qué fórmulas se usaron y cuáles nunca.
 *
 * Es lo que Notion no puede dar ni en principio: una fórmula sin estrenar no
 * tiene fila en ninguna base. Solo aparece cruzando el catálogo del vault contra
 * las piezas producidas.
 */

/** La mediana, y no el promedio. Con una pieza de 178.768 y tres de 2.000, el
 *  promedio dice 46.000 y ninguna pieza se parece a eso. */
function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

const COBERTURA: Record<string, string> = {
  tracked: "medida",
  pending: "pendiente",
  untracked: "sin trackear",
};

export default async function FormulasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);
  const catalogo = loadFormulas();

  // Las piezas agrupadas por su código. Una pieza sin código no entra en ninguna
  // fórmula, y NO se le adivina una por el parecido del nombre: una mal
  // clasificada haría figurar como usada una fórmula que nunca se estrenó, que
  // es justo el hallazgo que esta vista existe para dar.
  const porCodigo = new Map<string, PiezaDeFormula[]>();
  // Se cuentan aunque no se muestren: el `continue` de abajo es lo que impide
  // que una pieza sin código entre a una fórmula por parecido, y el contador deja
  // el criterio visible para quien lea esto.
  let sinClasificar = 0;
  for (const p of pieces) {
    const code = formulaCodeOf(p, catalogo.formulas);
    if (!code) {
      sinClasificar++;
      continue;
    }
    const alcance = primaryReach(p);
    porCodigo.set(code, [
      ...(porCodigo.get(code) ?? []),
      {
        slug: p.slug,
        title: p.title,
        href: `/${account}/piezas/${p.slug}`,
        canal: p.channel,
        publishedAt: p.publishedAt ?? "",
        estado: p.estado ?? p.status,
        cobertura: COBERTURA[p.coverage] ?? p.coverage,
        alcance,
        alcanceFmt: num(alcance),
        medida: alcance !== null,
      },
    ]);
  }

  const arma = (
    code: string,
    name: string,
    channel: string,
    estado: FilaFormula["estado"],
  ): FilaFormula => {
    const piezas = (porCodigo.get(code) ?? []).sort((a, b) =>
      (b.publishedAt || "").localeCompare(a.publishedAt || ""),
    );
    const med = mediana(piezas.map((x) => x.alcance).filter((x): x is number => x !== null));
    return {
      code,
      name,
      channel,
      estado,
      piezas,
      medidas: piezas.filter((x) => x.medida).length,
      mediana: med,
      medianaFmt: num(med),
    };
  };

  const filas: FilaFormula[] = catalogo.formulas.map((f) =>
    arma(f.code, f.name, f.channel, (porCodigo.get(f.code)?.length ?? 0) > 0 ? "usada" : "sin-estrenar"),
  );

  // Un código usado que el catálogo no declara igual se muestra: es una familia
  // de fórmulas que esta marca usa y que el catálogo todavía no documenta.
  // Esconderla perdería piezas del conteo y escondería el hallazgo.
  for (const code of porCodigo.keys()) {
    if (!filas.some((f) => f.code === code)) {
      filas.push(arma(code, code, "unknown", "fuera-de-catalogo"));
    }
  }

  void sinClasificar;

  return (
    <>
      <PageHeader title="Fórmulas" />
      <FormulasClient filas={filas} />
    </>
  );
}
