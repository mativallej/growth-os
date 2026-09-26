'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GrupoEstado } from '@/lib/config-env';
import { guardarConfig, probarConexiones, type Chequeo, type ResultadoConfig } from './actions.local';

const INICIAL: ResultadoConfig = { ok: true, mensaje: '' };

function Clave({ c }: { c: GrupoEstado['claves'][number] }) {
  const [borrar, setBorrar] = useState(false);
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="text-[13px] font-medium">{c.nombre}</code>
        {c.puesta ? (
          <Badge variant="success">puesta</Badge>
        ) : (
          <Badge variant="outline">vacía</Badge>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{c.descripcion}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          name={c.nombre}
          type={c.tipo === 'secreto' ? 'password' : 'text'}
          autoComplete="off"
          spellCheck={false}
          disabled={borrar}
          // El valor actual NO se precarga: el campo es de escritura. Lo que se
          // ve al lado es una máscara, y el valor completo nunca sale del server.
          placeholder={c.muestra ? `actual: ${c.muestra}` : 'sin configurar'}
          className="h-8 flex-1 text-xs sm:min-w-[18rem]"
          aria-label={c.nombre}
        />
        {c.puesta && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              name={`__borrar:${c.nombre}`}
              value="1"
              checked={borrar}
              onChange={(e) => setBorrar(e.target.checked)}
              className="size-3.5 accent-[hsl(var(--destructive))]"
            />
            borrar
          </label>
        )}
      </div>

      {c.donde && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/70">{c.donde}</p>
      )}
    </div>
  );
}

function Grupo({ g }: { g: GrupoEstado }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-medium">{g.titulo}</h2>
        {g.detalle && (
          <p className="mt-0.5 break-all text-[11px] text-muted-foreground">{g.detalle}</p>
        )}
        <div className="mt-4">
          {g.claves.map((c) => (
            <Clave key={c.nombre} c={c} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Config({
  marcas,
  general,
}: {
  marcas: GrupoEstado[];
  general: GrupoEstado;
}) {
  const [estado, accion, enviando] = useActionState(guardarConfig, INICIAL);
  const [chequeos, setChequeos] = useState<Chequeo[] | null>(null);
  const [probando, iniciarPrueba] = useTransition();

  return (
    <form action={accion}>
      <Tabs defaultValue={marcas[0]?.id ?? 'general'}>
        <TabsList>
          {marcas.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>
              {m.titulo}
            </TabsTrigger>
          ))}
          <TabsTrigger value="general">{general.titulo}</TabsTrigger>
        </TabsList>

        {/* Las pestañas se montan todas: un campo dentro de una pestaña cerrada
            tiene que viajar igual en el envío, o guardar desde una pestaña
            borraría lo que se escribió en la otra. */}
        {marcas.map((m) => (
          <TabsContent key={m.id} value={m.id} forceMount className="data-[state=inactive]:hidden">
            <Grupo g={m} />
          </TabsContent>
        ))}
        <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
          <Grupo g={general} />

          <Card className="mt-4">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">Probar las conexiones</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Consulta cada servicio de verdad, solo lectura. No escribe nada.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={probando}
                  onClick={() => iniciarPrueba(async () => setChequeos(await probarConexiones()))}
                >
                  {probando ? 'Probando…' : 'Probar'}
                </Button>
              </div>

              {chequeos && (
                <div className="mt-4 divide-y divide-border">
                  {chequeos.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 py-2.5 first:pt-0">
                      <span
                        aria-hidden="true"
                        className={`mt-1 size-2 shrink-0 rounded-full ${
                          c.ok ? 'bg-[var(--tg-green)]' : 'bg-[var(--tg-red)]'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">{c.nombre}</div>
                        <div className="text-[11px] leading-relaxed text-muted-foreground">
                          {c.detalle}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Button>
        {estado.mensaje && (
          <span className={`text-[13px] ${estado.ok ? 'text-muted-foreground' : 'text-[var(--tg-red)]'}`}>
            {estado.mensaje}
          </span>
        )}
      </div>

      <p className="mt-4 max-w-[70ch] text-[11px] leading-relaxed text-muted-foreground/70">
        Los valores se guardan en <code>.env.local</code>, que git ignora y queda en{' '}
        <code>600</code>. Un campo vacío <strong>no borra</strong>: para sacar una
        credencial hay que marcar <em>borrar</em>. Lo que se muestra al lado de cada clave
        es una máscara — el valor completo nunca sale del servidor.
      </p>
    </form>
  );
}
