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

/**
 * La barra de filtros, compartida por las vistas de lista.
 *
 * Todo en UNA fila arriba de los datos, y todo del lado del cliente: la marca es
 * la ruta (es la frontera de privacidad), y las facetas son estado del
 * navegador. Un filtro que necesita ir al servidor haría dinámica una página que
 * hoy es estática, y eso es lo que sostiene el aislamiento entre marcas.
 *
 * Los valores posibles salen de los datos, no de una lista fija: un canal nuevo
 * en el vault aparece solo.
 */

export type Opcion = { value: string; label: string; count?: number };

export type EstadoFiltros = {
  q: string;
  canal: string;
  formula: string;
  cobertura: string;
  desde: string;
  hasta: string;
  orden: string;
};

export const FILTROS_VACIOS: EstadoFiltros = {
  q: "",
  canal: "",
  formula: "",
  cobertura: "",
  desde: "",
  hasta: "",
  orden: "",
};

function Combo({
  valor,
  onChange,
  opciones,
  placeholder,
  ancho = "w-[8.5rem]",
}: {
  valor: string;
  onChange: (v: string) => void;
  opciones: Opcion[];
  placeholder: string;
  ancho?: string;
}) {
  if (opciones.length === 0) return null;
  return (
    // El valor vacío no puede ser "" en Radix, así que el "todos" viaja como
    // centinela y se traduce en el borde.
    <Select value={valor || "__todos"} onValueChange={(v) => onChange(v === "__todos" ? "" : v)}>
      <SelectTrigger className={ancho} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__todos">{placeholder}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined && (
              <span className="ml-1.5 tabular-nums text-muted-foreground">{o.count}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
  const set = (k: keyof EstadoFiltros) => (v: string) => onChange({ ...estado, [k]: v });
  const sucio = Object.values(estado).some(Boolean);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={estado.q}
          onChange={(e) => set("q")(e.target.value)}
          placeholder="Buscar…"
          className="h-8 w-full text-xs sm:w-56"
          aria-label="Buscar"
        />

        <Combo valor={estado.canal} onChange={set("canal")} opciones={canales} placeholder="Todas las redes" />
        <Combo valor={estado.formula} onChange={set("formula")} opciones={formulas} placeholder="Toda fórmula" />

        {conCobertura && (
          <Combo
            valor={estado.cobertura}
            onChange={set("cobertura")}
            placeholder="Toda cobertura"
            ancho="w-[9.5rem]"
            opciones={[
              { value: "tracked", label: "Medidas" },
              { value: "pending", label: "Pendientes" },
              { value: "untracked", label: "Sin trackear" },
            ]}
          />
        )}

        <Combo valor={estado.orden} onChange={set("orden")} opciones={ordenes} placeholder="Ordenar" ancho="w-[10rem]" />

        {conFechas && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={estado.desde}
              onChange={(e) => set("desde")(e.target.value)}
              className="h-8 w-[8.5rem] text-xs"
              aria-label="Publicadas desde"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={estado.hasta}
              onChange={(e) => set("hasta")(e.target.value)}
              className="h-8 w-[8.5rem] text-xs"
              aria-label="Publicadas hasta"
            />
          </div>
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

/** El filtrado en sí, compartido para que las dos vistas filtren igual. */
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
  return filas.filter((r) => {
    if (q && !r.search.includes(q)) return false;
    if (f.canal && r.canal !== f.canal) return false;
    if (f.formula && r.formulaCode !== f.formula) return false;
    if (f.cobertura && r.coverage !== f.cobertura) return false;
    if (f.desde && (!r.publishedAt || r.publishedAt < f.desde)) return false;
    if (f.hasta && (!r.publishedAt || r.publishedAt > f.hasta)) return false;
    return true;
  });
}
