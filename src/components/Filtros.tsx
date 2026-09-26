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
import RangoAlcance, { type RangoNum } from "@/components/RangoAlcance";
import type { Umbrales } from "@/lib/viralidad";

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
  /** Facetas de ads: persona, ángulo y ronda. Vacías cuando la materia es orgánico. */
  personas: string[];
  angulos: string[];
  rondas: string[];
  desde: string;
  hasta: string;
  /** Niveles de viralidad. Ver src/lib/viralidad.ts. */
  niveles: string[];
  /** Rango de alcance. Strings porque se tipean; se convierten al filtrar. */
  alcanceMin: string;
  alcanceMax: string;
  /** Solo las marcadas en este navegador. */
  soloFavoritos: boolean;
  orden: string;
};

export const FILTROS_VACIOS: EstadoFiltros = {
  q: "",
  canales: [],
  formulas: [],
  coberturas: [],
  personas: [],
  angulos: [],
  rondas: [],
  desde: "",
  hasta: "",
  niveles: [],
  alcanceMin: "",
  alcanceMax: "",
  soloFavoritos: false,
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
  niveles = [],
  umbrales = {},
  favoritos = 0,
  personas = [],
  angulos = [],
  rondas = [],
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
  /** Niveles de viralidad presentes, con su conteo. Vacío = no se dibuja. */
  niveles?: Opcion[];
  /** Los umbrales declarados, para los atajos de alcance y para poder decir el criterio. */
  umbrales?: Umbrales;
  /** Cuántos favoritos hay guardados, para el rótulo del toggle. */
  favoritos?: number;
  /** Facetas de ads. Vacías en orgánico, y un MultiSelect sin opciones no se dibuja. */
  personas?: Opcion[];
  angulos?: Opcion[];
  rondas?: Opcion[];
  resultados: number;
  total: number;
}) {
  const set = <K extends keyof EstadoFiltros>(k: K) => (v: EstadoFiltros[K]) =>
    onChange({ ...estado, [k]: v });

  const sucio =
    Boolean(estado.q || estado.desde || estado.hasta || estado.orden) ||
    estado.canales.length > 0 ||
    estado.formulas.length > 0 ||
    estado.coberturas.length > 0 ||
    estado.personas.length > 0 ||
    estado.angulos.length > 0 ||
    estado.rondas.length > 0 ||
    estado.niveles.length > 0 ||
    Boolean(estado.alcanceMin || estado.alcanceMax) ||
    estado.soloFavoritos;

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
        <MultiSelect
          titulo="Viralidad"
          opciones={niveles}
          valor={estado.niveles}
          onChange={set("niveles")}
        />
        {conCobertura && (
          <MultiSelect
            titulo="Cobertura"
            opciones={COBERTURAS}
            valor={estado.coberturas}
            onChange={set("coberturas")}
          />
        )}

        {/* Las de ads. `MultiSelect` no se dibuja sin opciones, así que en
            orgánico desaparecen solas. */}
        <MultiSelect titulo="Persona" opciones={personas} valor={estado.personas} onChange={set("personas")} />
        <MultiSelect titulo="Ángulo" opciones={angulos} valor={estado.angulos} onChange={set("angulos")} />
        <MultiSelect titulo="Ronda" opciones={rondas} valor={estado.rondas} onChange={set("rondas")} buscable />

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

        {/* El toggle de favoritos es binario, así que es un botón y no un
            MultiSelect: "favoritos y no favoritos" es no filtrar. */}
        <Button
          variant={estado.soloFavoritos ? "default" : "outline"}
          size="sm"
          onClick={() => set("soloFavoritos")(!estado.soloFavoritos)}
          aria-pressed={estado.soloFavoritos}
          title="Solo las piezas marcadas en este navegador"
        >
          <span aria-hidden="true">{estado.soloFavoritos ? "★" : "☆"}</span>
          <span className="ml-1">Favoritos</span>
          {favoritos > 0 && <span className="ml-1 tabular-nums opacity-70">{favoritos}</span>}
        </Button>

        {conFechas && (
          <RangoFechas
            valor={{ desde: estado.desde, hasta: estado.hasta } as Rango}
            onChange={(r) => onChange({ ...estado, desde: r.desde, hasta: r.hasta })}
          />
        )}

        {Object.keys(umbrales).length > 0 && (
          <RangoAlcance
            valor={{ min: estado.alcanceMin, max: estado.alcanceMax } as RangoNum}
            onChange={(r) => onChange({ ...estado, alcanceMin: r.min, alcanceMax: r.max })}
            atajos={Object.entries(umbrales)
              .sort()
              .map(([canal, u]) => ({ label: `viral ${canal}`, min: u.viral }))}
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
        {(estado.alcanceMin || estado.alcanceMax) && (
          // Lo mismo con el alcance, y acá pesa más: al 2026-09-26 solo 42 de 129
          // piezas de Tegu tienen alcance, así que un rango esconde la mayoría.
          <span className="ml-2">· las piezas sin alcance medido quedan fuera del rango</span>
        )}
        {estado.soloFavoritos && (
          <span className="ml-2">· los favoritos son de este navegador, no se comparten</span>
        )}
      </p>
    </div>
  );
}

/**
 * El filtrado, compartido para que las vistas filtren igual.
 * Una faceta vacía NO filtra: sin selección se ve todo, no nada.
 */
export function aplicarFiltros<
  T extends {
    search: string;
    canal: string;
    formulaCode: string;
    coverage: string;
    publishedAt: string;
    persona?: string;
    angulo?: string;
    ronda?: string;
    nivel?: string;
    alcance?: number | null;
    llave?: string;
  },
>(filas: T[], f: EstadoFiltros, favoritos?: Set<string>): T[] {
  const q = f.q.trim().toLowerCase();
  const canales = new Set(f.canales);
  const formulas = new Set(f.formulas);
  const coberturas = new Set(f.coberturas);
  const personas = new Set(f.personas);
  const angulos = new Set(f.angulos);
  const rondas = new Set(f.rondas);
  const niveles = new Set(f.niveles);

  // Los extremos del rango se convierten UNA vez, no por fila. Un extremo que no
  // es número se trata como ausente: mientras alguien tipea, el input pasa por
  // estados intermedios, y no tiene que vaciar la lista en el camino.
  const min = Number(f.alcanceMin);
  const max = Number(f.alcanceMax);
  const hayMin = f.alcanceMin !== "" && Number.isFinite(min);
  const hayMax = f.alcanceMax !== "" && Number.isFinite(max);

  return filas.filter((r) => {
    if (q && !r.search.includes(q)) return false;
    if (canales.size && !canales.has(r.canal)) return false;
    if (formulas.size && !formulas.has(r.formulaCode)) return false;
    if (coberturas.size && !coberturas.has(r.coverage)) return false;
    if (personas.size && !personas.has(r.persona ?? "")) return false;
    if (angulos.size && !angulos.has(r.angulo ?? "")) return false;
    if (rondas.size && !rondas.has(r.ronda ?? "")) return false;
    if (niveles.size && !niveles.has(r.nivel ?? "")) return false;
    if (f.desde && (!r.publishedAt || r.publishedAt < f.desde)) return false;
    if (f.hasta && (!r.publishedAt || r.publishedAt > f.hasta)) return false;

    // Una pieza SIN alcance medido queda fuera de cualquier rango. No es lo mismo
    // que alcance 0: `null` es que nadie lo midió, y meterla en el rango "0 a N"
    // la contaría como que no llegó a nadie, que es afirmar algo que no se sabe.
    // La barra de filtros lo dice cuando el rango está activo.
    if (hayMin || hayMax) {
      const a = r.alcance;
      if (a === null || a === undefined) return false;
      if (hayMin && a < min) return false;
      if (hayMax && a > max) return false;
    }

    // Sin set de favoritos, el toggle no puede filtrar nada: pasa todo en vez de
    // vaciar la lista, que se leería como "no tenés favoritos".
    if (f.soloFavoritos && favoritos && !favoritos.has(r.llave ?? "")) return false;
    return true;
  });
}
