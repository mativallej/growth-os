import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import CampanasClient, {
  type CreativoRow,
  type PersonaEje,
} from "@/components/CampanasClient";
import { findSource } from "@/lib/sources";
import { adCoverage, adUniverse, loadAdsBySource } from "@/lib/ads";

export default async function CampanasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  // `excluidos` se descarta: el conteo se mostraba al pie y esa nota se quitó.
  // El filtrado sigue pasando adentro de `loadAdsBySource` — framework, rondas y
  // evaluaciones no son creativos.
  const { creatives } = loadAdsBySource([source]);
  const universo = adUniverse([source]).personas;
  const cov = adCoverage(creatives, universo);

  if (universo.length === 0 && creatives.length === 0) {
    return (
      <>
        <PageHeader title="Campañas" subtitle={source.label} />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm">Esta marca no declara creativos de campaña.</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Las raíces de ads se declaran en <code>config/sources.json</code>, en{" "}
              <code>notion.ads</code> de la marca.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // EL EJE, que sale del framework del vault y NO de los creativos: las personas
  // y sus dolores son lo que SE PODRÍA cubrir. La matriz en sí la calcula el
  // cliente, porque se recalcula con cada filtro — filtrar por ronda tiene que
  // responder "cómo quedó la cobertura EN esa ronda", no solo mostrar esos
  // creativos.
  //
  // El eje es persona × ángulo y no persona × dolor × ángulo: eso último da 72
  // celdas con 62 en cero, y una grilla casi vacía se lee como un error de la app
  // en vez de como el hueco que es. El dolor no se pierde — es una columna del
  // detalle y un filtro.
  const eje: PersonaEje[] = cov.personas.map((persona) => ({
    persona,
    publico: universo.find((u) => u.persona === persona)?.publico,
    dolores: universo.find((u) => u.persona === persona)?.dolores ?? [],
  }));

  // Solo los campos que la tabla muestra. Un `Creative` entero lleva `path`
  // absoluto, y eso es la ruta del disco de alguien: no tiene por qué viajar al
  // navegador.
  const creativos: CreativoRow[] = creatives
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      relPath: c.relPath,
      persona: c.persona,
      publico: c.publico,
      dolor: c.dolor,
      formato: c.formato,
      angulo: c.angulo,
      anguloRaw: c.anguloRaw,
      ronda: c.ronda,
      estado: c.estado,
      derivadas: c.derivadas,
    }))
    .sort(
      (a, b) =>
        (a.persona ?? "").localeCompare(b.persona ?? "") ||
        (a.ronda ?? "").localeCompare(b.ronda ?? "") ||
        a.title.localeCompare(b.title),
    );

  return (
    <>
      <PageHeader title="Campañas" />

      <CampanasClient eje={eje} angulos={cov.angulos} creativos={creativos} />

    </>
  );
}
