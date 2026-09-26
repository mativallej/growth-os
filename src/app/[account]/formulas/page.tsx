import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/PageHeader";
import BarList from "@/components/BarList";
import { loadPieces } from "@/lib/parse";
import { findSource } from "@/lib/sources";
import { loadFormulas } from "@/lib/formulas";
import { formulaUsage } from "@/lib/rollups";
import { num } from "@/lib/metrics";

export default async function FormulasPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const source = findSource(account);
  if (!source) notFound();

  const pieces = loadPieces([source]);
  const catalogo = loadFormulas();
  const { used, unused, unclassified } = formulaUsage(pieces, catalogo.formulas);
  const fueraDeCatalogo = used.filter((f) => f.channel === "unknown");

  return (
    <>
      <PageHeader
        title="Fórmulas"
        subtitle={`${source.label} · uso por código, incluidas las que nunca se estrenaron`}
      />

      {/* Esto es lo que Notion no puede dar ni en principio: una fórmula sin
          estrenar no tiene fila en ninguna base. Solo aparece cruzando el
          catálogo contra las piezas — por eso va primero. */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Sin estrenar</h3>
          {unused.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Todas las fórmulas del catálogo tienen al menos una pieza.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground tabular-nums">{num(unused.length)}</strong>{" "}
                fórmulas del catálogo sin una sola pieza en esta marca.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unused.map((f) => (
                  <Badge key={f.code} variant="outline" title={f.name}>
                    <span className="font-mono">{f.code}</span>
                    <span className="ml-1.5 max-w-[16ch] truncate text-muted-foreground">{f.name}</span>
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-xs font-medium text-muted-foreground">
            Uso ({num(used.length)} códigos)
          </h3>
          <BarList
            items={used.map((f) => ({ label: f.code, value: f.count }))}
            labelClassName="w-16 font-mono"
            empty="Ninguna pieza tiene un código de fórmula asignado."
          />
        </CardContent>
      </Card>

      {fueraDeCatalogo.length > 0 && (
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{num(fueraDeCatalogo.length)}</strong> códigos
          usados ({fueraDeCatalogo.map((f) => f.code).join(", ")}) <strong>no están en el
          catálogo</strong>. No es un error de clasificación: son familias de fórmula que
          esta marca usa y que el catálogo todavía no documenta.
        </p>
      )}

      {unclassified > 0 && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground tabular-nums">{num(unclassified)}</strong> de{" "}
          {num(pieces.length)} piezas <strong>sin clasificar</strong>: no declaran un código
          en el footer ni viven en una carpeta que nombre uno.{" "}
          <span className="text-muted-foreground/70">
            No se les adivina uno por el parecido del nombre — una pieza mal clasificada
            haría figurar como usada una fórmula que en realidad nunca se estrenó, que es
            justo lo que esta vista existe para mostrar.
          </span>
        </p>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground/70">
        Catálogo:{" "}
        {catalogo.origin === "catalogo" ? (
          <>leído del vault · {num(catalogo.formulas.length)} fórmulas</>
        ) : (
          <>
            <strong>no se encontró</strong> — se usan los códigos de reserva, sin sus
            nombres. Apuntalo con <code>CATALOG_DIR</code>.
          </>
        )}
      </p>
    </>
  );
}
