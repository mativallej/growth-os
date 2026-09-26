'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GrupoEstado } from '@/lib/config-env';
import { guardarConfig, probarConexiones, type Chequeo, type ResultadoConfig } from './actions.local';
import Vaults, { type MarcaListada } from './Vaults.local';
import Viralidad, { type FilaCanal } from './Viralidad.local';
import { Desplegable } from '@/components/ui/accordion';

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

function Grupo({ g, abierto }: { g: GrupoEstado; abierto?: boolean }) {
  const puestas = g.claves.filter((c) => c.puesta).length;
  // Desplegable y no tarjeta abierta: con n marcas, todas expandidas a la vez
  // vuelven la pantalla imposible de recorrer.
  return (
    <Desplegable
      titulo={g.titulo}
      detalle={g.detalle}
      abiertoPorDefecto={abierto}
      acciones={
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {puestas}/{g.claves.length}
        </span>
      }
    >
      {g.claves.map((c) => (
        <Clave key={c.nombre} c={c} />
      ))}
    </Desplegable>
  );
}

/**
 * El pie del formulario de claves: guardar, el mensaje y la nota de `.env.local`.
 *
 * Se repite en las dos pestañas que guardan claves porque cada una es su PROPIO
 * formulario, y el botón tiene que estar dentro del que envía.
 *
 * Va acá arriba y no adentro de `Config`: un componente definido durante el
 * render es un TIPO nuevo en cada render, así que React desmonta y vuelve a
 * montar todo el subárbol en cada tecla — el compilador lo marca como error.
 */
function PieClaves({
  enviando,
  estado,
}: {
  enviando: boolean;
  estado: { ok: boolean; mensaje: string };
}) {
  return (
    <>
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
    </>
  );
}

export default function Config({
  marcas,
  general,
  listado,
  canales,
}: {
  marcas: GrupoEstado[];
  general: GrupoEstado;
  listado: MarcaListada[];
  canales: FilaCanal[];
}) {
  const [estado, accion, enviando] = useActionState(guardarConfig, INICIAL);
  const [chequeos, setChequeos] = useState<Chequeo[] | null>(null);
  const [probando, iniciarPrueba] = useTransition();

  return (
    <Tabs defaultValue="marcas">
      {/* Pestañas FIJAS. Antes cada marca era su propia pestaña, mezcladas con
          las de función: con cinco marcas la barra tiene siete botones y deja de
          leerse. Las marcas son una dimensión que crece — van adentro de una
          pestaña, como desplegables. */}
      <TabsList>
        <TabsTrigger value="marcas">
          Marcas
          <span className="ml-1.5 tabular-nums opacity-60">{marcas.length}</span>
        </TabsTrigger>
        <TabsTrigger value="general">{general.titulo}</TabsTrigger>
        <TabsTrigger value="viralidad">Viralidad</TabsTrigger>
        <TabsTrigger value="vaults">Agregar o quitar</TabsTrigger>
      </TabsList>

      {/* UN FORMULARIO POR PESTAÑA, Y NINGUNO ANIDADO.
          Antes había un solo `<form>` envolviendo las cuatro, y adentro `Vaults`
          abría los suyos. Un `<form>` dentro de otro es HTML inválido: el parser
          del navegador DESCARTA el interno, así que "agregar vault" enviaba el
          formulario de claves — la acción equivocada. El comentario de acá decía
          que no estaba adentro; la estructura decía que sí.

          Separarlos es seguro porque `guardarConfig` solo escribe las claves que
          VIENEN con valor: una pestaña que no manda sus campos no borra nada.

          `forceMount` se queda, pero por otra razón que antes: ya no hace falta
          para no perder datos al guardar, sino para no perder lo TIPEADO al
          cambiar de pestaña. */}
      <TabsContent value="marcas" forceMount className="data-[state=inactive]:hidden">
        <form action={accion}>
          <div className="space-y-3">
            {marcas.map((m, i) => (
              <Grupo key={m.id} g={m} abierto={i === 0} />
            ))}
          </div>
          <PieClaves enviando={enviando} estado={estado} />
        </form>
      </TabsContent>

      <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
        <form action={accion}>
          <Grupo g={general} abierto />
          <PieClaves enviando={enviando} estado={estado} />
        </form>

        {/* Las conexiones van FUERA del formulario, en la misma pestaña: es un
            botón que consulta, no un envío, y adentro un enter en un campo de
            clave podría dispararlo. Dos `TabsContent` con el mismo `value`
            tampoco: Radix monta los dos y el segundo pisa al primero. */}
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

      <TabsContent value="viralidad">
        <Viralidad filas={canales} />
      </TabsContent>

      <TabsContent value="vaults">
        <Vaults marcas={listado} />
      </TabsContent>
    </Tabs>
  );
}
