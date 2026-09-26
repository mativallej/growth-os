'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { guardarViralidad } from './actions.local';
import type { Distribucion, Resultado } from '@/lib/config-viralidad';

const INICIAL: Resultado = { ok: true, mensaje: '' };

export type FilaCanal = {
  canal: string;
  viral: string;
  destacado: string;
  dist: Distribucion;
};

const fmt = (n: number) => n.toLocaleString('es-AR');

/**
 * Qué cuenta como viral, por canal.
 *
 * MUESTRA LA DISTRIBUCIÓN REAL AL LADO DE CADA CAMPO. Sin eso, elegir un umbral
 * es adivinar: no hay forma de saber si 50.000 es mucho o poco en un canal sin
 * ver contra qué. Los percentiles del propio corpus son la única referencia
 * honesta que existe, porque "viral" acá significa "outlier PARA ESTA MARCA".
 *
 * Y dice el tamaño de la muestra, que es la advertencia que importa: con 17
 * piezas medidas, un p90 son dos piezas. Es un punto de partida para ajustar
 * mirando, no una ley.
 */
function Referencia({ d }: { d: Distribucion }) {
  if (!d.hay) {
    return (
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
        <strong>Ninguna de sus {d.total} piezas está medida</strong>, así que no hay de
        dónde sacar un umbral. Dejalo vacío: sus piezas van a decir «sin umbral», que es
        el dato — no «no viral», que sería afirmar algo que nadie midió.
      </p>
    );
  }
  return (
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
      {d.medidas} de {d.total} piezas medidas · mediana {fmt(d.mediana)} · p75{' '}
      <strong>{fmt(d.p75)}</strong> · p90 <strong>{fmt(d.p90)}</strong> · máximo{' '}
      {fmt(d.max)}
      {d.medidas < 30 && (
        <>
          {' '}
          — con {d.medidas} piezas el p90 son dos o tres, así que tomalo como punto de
          partida.
        </>
      )}
    </p>
  );
}

export default function Viralidad({ filas }: { filas: FilaCanal[] }) {
  const [r, accion, guardando] = useActionState(guardarViralidad, INICIAL);
  const texto = r.ok ? r.mensaje : r.error;

  return (
    <form action={accion} className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-medium">Qué cuenta como viral</h3>
          <p className="mt-0.5 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground">
            Es criterio tuyo, no un cálculo de la app: «viral» significa algo distinto en
            cada red, y derivarlo solo sería inventar el criterio. Va por <strong>alcance</strong>{' '}
            y no por engagement porque el eng-rate hoy es computable en cero piezas — un
            filtro por engagement estaría siempre vacío. Se guarda en{' '}
            <code>config/viralidad.json</code>.
          </p>

          <div className="mt-4 divide-y divide-border">
            {filas.map((f) => (
              <div key={f.canal} className="py-4 first:pt-0">
                <input type="hidden" name={`canal:${f.canal}`} value={f.canal} />
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[7rem] flex-1">
                    <div className="text-[13px] font-medium">{f.canal}</div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      destacada desde
                    </span>
                    <Input
                      type="number"
                      min={0}
                      name={`destacado:${f.canal}`}
                      defaultValue={f.destacado}
                      placeholder="opcional"
                      className="h-8 w-[8rem] text-xs"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      viral desde
                    </span>
                    <Input
                      type="number"
                      min={0}
                      name={`viral:${f.canal}`}
                      defaultValue={f.viral}
                      placeholder="sin umbral"
                      className="h-8 w-[8rem] text-xs"
                    />
                  </label>
                </div>
                <Referencia d={f.dist} />
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar umbrales'}
            </Button>
            <span className="text-[11px] text-muted-foreground/70">
              Vaciar «viral desde» quita el criterio de ese canal.
            </span>
          </div>

          {texto && (
            <p
              className={`mt-3 text-[13px] leading-relaxed ${
                r.ok ? 'text-muted-foreground' : 'text-[var(--tg-red)]'
              }`}
            >
              {texto}
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
