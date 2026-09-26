"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiSelect, { type Opcion } from "@/components/MultiSelect";
import RangoFechas, { type Rango } from "@/components/RangoFechas";

/**
 * La barra de filtros, compartida por las vistas de lista.
 *
 * Las FACETAS son multi-select: la pregunta real casi nunca es "Instagram o
 * Twitter", es "Instagram y Twitter, sin Blog". Un dropdown de opción única
 * obliga a mirar de a una y a perder la comparación, que es el punto.
 *
 * El ORDEN sí es de opción única, porque una lista se ordena por un criterio a
 * la vez.
 *
 * Todo del lado del cliente: la marca es la ruta (es la frontera de privacidad),
 * y las facetas son estado del navegador. Un filtro que necesita ir al servidor
 * haría dinámica una página que hoy es estática, y eso es lo que sostiene el
 * aislamiento entre marcas.
 */

export type { Opcion };

export type EstadoFiltros = {
  q: string;
  canales: string[];
  formulas: string[];
  coberturas: string[];
  desde: string;
  hasta: string;
  orden: string;
};

export const FILTROS_VACIOS: EstadoFiltros = {
  q: "",
  canales: [],
  formulas: [],
  coberturas: [],
  desde: "",
  hasta: "",
  orden: "",
};

const COBERTURAS: Opcion[] = [
  { value: "tracked", label: "Medidas" },
  { value: "pending", label: "Pendientes" },
  { value: "untracked", label: "Sin trackear" },
];

export default function Filtros({
  estado,
  onChange,
  canales,
  formulas,
  ordenes,
  conFechas = true,
  conCobertura = true,
  resultados,
  total,
}: {
  estado: EstadoFiltros;
  onChange: (e: EstadoFiltros) => void;
  canales: Opcion[];
  formulas: Opcion[];
  ordenes: Opcion[];
  conFechas?: boolean;
  conCobertura?: boolean;
  resultados: number;
  total: number;
}) {
  const set = <K extends keyof EstadoFiltros>(k: K) => (v: EstadoFiltros[K]) =>
    onChange({ ...estado, [k]: v });

  const sucio =
    Boolean(estado.q || estado.desde || estado.hasta || estado.orden) ||
    estado.canales.length > 0 ||
    estado.formulas.length > 0 ||
    estado.coberturas.length > 0;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={estado.q}
          onChange={(e) => set("q")(e.target.value)}
          placeholder="Buscar…"
          className="h-8 w-full text-xs sm:w-48"
          aria-label="Buscar"
        />

        <MultiSelect titulo="Red" opciones={canales} valor={estado.canales} onChange={set("canales")} />
        <MultiSelect
          titulo="Fórmula"
          opciones={formulas}
          valor={estado.formulas}
          onChange={set("formulas")}
          buscable
        />
        {conCobertura && (
          <MultiSelect
            titulo="Cobertura"
            opciones={COBERTURAS}
            valor={estado.coberturas}
            onChange={set("coberturas")}
          />
        )}

        {/* Una lista se ordena por UN criterio: acá la opción única es correcta. */}
        <Select
          value={estado.orden || "__defecto"}
          onValueChange={(v) => set("orden")(v === "__defecto" ? "" : v)}
        >
          <SelectTrigger className="w-[9.5rem]" aria-label="Ordenar">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__defecto">Orden por defecto</SelectItem>
            {ordenes.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {conFechas && (
          <RangoFechas
            valor={{ desde: estado.desde, hasta: estado.hasta } as Rango}
            onChange={(r) => onChange({ ...estado, desde: r.desde, hasta: r.hasta })}
          />
        )}

        {sucio && (
          <Button variant="ghost" size="sm" onClick={() => onChange(FILTROS_VACIOS)}>
            Limpiar
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        <span className="tabular-nums">{resultados}</span> de{" "}
        <span className="tabular-nums">{total}</span>
        {(estado.desde || estado.hasta) && (
          // Un filtro de fechas deja afuera lo que no tiene fecha, y eso hay que
          // decirlo: si no, una pieza sin fecha parece que no existe.
          <span className="ml-2">· las piezas sin fecha quedan fuera del rango</span>
        )}
      </p>
    </div>
  );
}

/**
 * El filtrado, compartido para que las dos vistas filtren igual.
 * Una faceta vacía NO filtra: sin selección se ve todo, no nada.
 */
export function aplicarFiltros<
  T extends {
    search: string;
    canal: string;
    formulaCode: string;
    coverage: string;
    publishedAt: string;
  },
>(filas: T[], f: EstadoFiltros): T[] {
  const q = f.q.trim().toLowerCase();
  const canales = new Set(f.canales);
  const formulas = new Set(f.formulas);
  const coberturas = new Set(f.coberturas);
  return filas.filter((r) => {
    if (q && !r.search.includes(q)) return false;
    if (canales.size && !canales.has(r.canal)) return false;
    if (formulas.size && !formulas.has(r.formulaCode)) return false;
    if (coberturas.size && !coberturas.has(r.coverage)) return false;
    if (f.desde && (!r.publishedAt || r.publishedAt < f.desde)) return false;
    if (f.hasta && (!r.publishedAt || r.publishedAt > f.hasta)) return false;
    return true;
  });
}
