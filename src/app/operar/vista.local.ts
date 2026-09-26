import type { Alcance, FormaDeEjecucion, Operation, ParamSpec } from '@/lib/operations';
import type { Faltante } from '@/lib/operations';
import { evaluar } from '@/lib/operations';
import { antiguedad, describir } from '@/lib/last-run';

// El catálogo lleva funciones adentro (las precondiciones se evalúan, los args se
// derivan), y eso no cruza al cliente. Acá se aplana a datos.

export type ParamVista = {
  id: string;
  label: string;
  kind: ParamSpec['kind'];
  ayuda?: string;
  requerido: boolean;
  porDefecto?: string;
  valores?: readonly string[];
};

export type OpVista = {
  id: string;
  nombre: string;
  descripcion: string;
  forma: FormaDeEjecucion;
  marcas: string[] | null;
  alcances: Alcance[];
  etapa: 1 | 2;
  params: ParamVista[];
  disparable: boolean;
  faltantes: Faltante[];
  bloqueo?: string;
  antiguedadTexto: string;
  antiguedadEstado: 'nunca' | 'al-dia' | 'vencida' | 'sin-periodo';
  queRevisar: string[];
};

export function aVista(op: Operation): OpVista {
  const d = evaluar(op);
  const a = antiguedad(op);
  return {
    id: op.id,
    nombre: op.nombre,
    descripcion: op.descripcion,
    forma: op.forma,
    marcas: op.marcas,
    alcances: op.alcances,
    etapa: op.etapa,
    params: op.params.map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      ayuda: p.ayuda,
      requerido: Boolean(p.requerido),
      porDefecto: p.porDefecto,
      valores: p.kind === 'enum' ? p.valores : undefined,
    })),
    disparable: d.disparable,
    faltantes: d.faltantes,
    bloqueo: d.bloqueo,
    antiguedadTexto: describir(a),
    antiguedadEstado: a.estado,
    queRevisar: op.queRevisar ?? [],
  };
}
