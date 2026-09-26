'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { captarIdea, dispararOperacion, marcarIdeaPublicada } from './actions.local';
import { SIN_RESULTADO, type ResultadoAccion } from './tipos.local';
import type { OpVista, ParamVista } from './vista.local';

type IdeaVista = { id: string; texto: string; marca: string; dias: number };

const FORMA: Record<string, string> = {
  captura: 'la app la guarda',
  export: 'produce un archivo',
  sesion: 'la ejecuta una sesión local',
};

function Resultado({ r }: { r: ResultadoAccion }) {
  if (!r.mensaje) return null;
  return (
    <div
      className={`mt-3 rounded-md border px-3 py-2 text-[13px] ${
        r.ok ? 'border-border bg-muted/40' : 'border-destructive/40 bg-destructive/5'
      }`}
    >
      <p className={r.ok ? '' : 'text-destructive'}>{r.mensaje}</p>
      {r.comando && (
        <pre className="mt-2 overflow-x-auto rounded bg-background/70 p-2 text-[11px]">{r.comando}</pre>
      )}
      {r.archivo && <p className="mt-1 text-[11px] text-muted-foreground">contexto: {r.archivo}</p>}
      {r.detalle && !r.ok && (
        <pre className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">{r.detalle}</pre>
      )}
    </div>
  );
}

function Campo({ p }: { p: ParamVista }) {
  const etiqueta = (
    <span className="text-[12px] font-medium">
      {p.label}
      {p.requerido && <span className="text-destructive"> *</span>}
    </span>
  );

  return (
    <label className="flex flex-col gap-1">
      {etiqueta}
      {p.kind === 'enum' ? (
        <select
          name={p.id}
          defaultValue={p.porDefecto ?? ''}
          className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
        >
          {!p.requerido && <option value="">(sin valor)</option>}
          {p.valores?.map((v) => (
            <option key={v} value={v}>
              {v}
              {/* El default se declara y se ve ANTES de ejecutar: nunca un "todos" tácito. */}
              {v === p.porDefecto ? '  · default' : ''}
            </option>
          ))}
        </select>
      ) : (
        <Input name={p.id} type={p.kind === 'fecha' ? 'date' : 'text'} className="h-9 text-[13px]" />
      )}
      {p.ayuda && <span className="text-[11px] text-muted-foreground">{p.ayuda}</span>}
    </label>
  );
}

function Operacion({ op }: { op: OpVista }) {
  const [estado, accion, corriendo] = useActionState(dispararOperacion, SIN_RESULTADO);

  return (
    <Card className={op.disparable ? '' : 'opacity-75'}>
      <CardHeader className="gap-2 p-5 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-[15px]">{op.nombre}</CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal">
            {FORMA[op.forma]}
          </Badge>
          {op.marcas && (
            <Badge variant="outline" className="text-[10px] font-normal">
              solo {op.marcas.join(' · ')}
            </Badge>
          )}
          {op.alcances.includes('elemento') && (
            <Badge variant="outline" className="text-[10px] font-normal">
              por elemento
            </Badge>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">{op.descripcion}</p>
        <p
          className={`text-[11px] ${
            op.antiguedadEstado === 'vencida'
              ? 'font-medium text-destructive'
              : op.antiguedadEstado === 'nunca'
                ? 'text-amber-600 dark:text-amber-500'
                : 'text-muted-foreground'
          }`}
        >
          Última corrida: {op.antiguedadTexto}
        </p>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {op.bloqueo && (
          <p className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
            {op.bloqueo}
          </p>
        )}

        {op.faltantes.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <p className="text-[12px] font-medium">No se puede disparar todavía:</p>
            <ul className="mt-1 space-y-1">
              {op.faltantes.map((f) => (
                <li key={f.id} className="text-[12px] text-muted-foreground">
                  {f.falta} <span className="opacity-80">→ {f.comoObtenerlo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={accion} className="flex flex-col gap-3">
          <input type="hidden" name="__operacion" value={op.id} />
          {op.params.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {op.params.map((p) => (
                <Campo key={p.id} p={p} />
              ))}
            </div>
          )}

          {op.queRevisar.length > 0 && (
            <details className="text-[12px] text-muted-foreground">
              <summary className="cursor-pointer">Qué va a revisar la sesión</summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {op.queRevisar.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </details>
          )}

          <div>
            <Button type="submit" size="sm" disabled={!op.disparable || corriendo}>
              {corriendo ? 'Preparando…' : op.forma === 'sesion' ? 'Preparar y abrir sesión' : 'Ejecutar'}
            </Button>
          </div>
        </form>

        <Resultado r={estado} />
      </CardContent>
    </Card>
  );
}

function Captura({ marcas }: { marcas: string[] }) {
  const [estado, accion, corriendo] = useActionState(captarIdea, SIN_RESULTADO);
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-[15px]">Captar una idea</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Se guarda en la cola local al instante. No depende de la red: una idea se capta cuando
          aparece o se pierde.
        </p>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <form action={accion} className="flex flex-col gap-3">
          <textarea
            name="texto"
            rows={3}
            required
            placeholder="La idea, como salga."
            className="rounded-md border border-input bg-background px-3 py-2 text-[13px]"
          />
          <div className="flex items-center gap-2">
            <select
              name="marca"
              className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
            >
              {marcas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={corriendo}>
              {corriendo ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
        <Resultado r={estado} />
      </CardContent>
    </Card>
  );
}

function Cola({ ideas }: { ideas: IdeaVista[] }) {
  const [estado, accion] = useActionState(marcarIdeaPublicada, SIN_RESULTADO);
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-[15px]">Cola de ideas ({ideas.length})</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Pendientes de publicar. La antigüedad está a la vista para que no se olviden solas.
        </p>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {ideas.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No hay nada pendiente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ideas.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 border-b border-border pb-2">
                <div>
                  <p className="text-[13px]">{i.texto}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.marca} · hace {i.dias} {i.dias === 1 ? 'día' : 'días'} · {i.id}
                  </p>
                </div>
                <form action={accion}>
                  <input type="hidden" name="id" value={i.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Marcar publicada
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <Resultado r={estado} />
      </CardContent>
    </Card>
  );
}

export default function Consola({
  operaciones,
  ideas,
  marcas,
}: {
  operaciones: OpVista[];
  ideas: IdeaVista[];
  marcas: string[];
}) {
  const etapa1 = operaciones.filter((o) => o.etapa === 1);
  const etapa2 = operaciones.filter((o) => o.etapa === 2);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <Captura marcas={marcas} />
        <Cola ideas={ideas} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Operaciones
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {etapa1
            .filter((o) => o.forma !== 'captura')
            .map((o) => (
              <Operacion key={o.id} op={o} />
            ))}
        </div>
      </section>

      {etapa2.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Declaradas, todavía no disponibles
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {etapa2.map((o) => (
              <Operacion key={o.id} op={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
