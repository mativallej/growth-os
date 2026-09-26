'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { agregarVault, quitarVault } from './actions.local';
import type { Resultado } from '@/lib/config-marcas';

const INICIAL: Resultado = { ok: true, mensaje: '' };

export type MarcaListada = { id: string; label: string; vault: string; content: string };

function Mensaje({ r }: { r: Resultado }) {
  const texto = r.ok ? r.mensaje : r.error;
  if (!texto) return null;
  return (
    <p className={`mt-2 text-[13px] leading-relaxed ${r.ok ? 'text-muted-foreground' : 'text-[var(--tg-red)]'}`}>
      {texto}
    </p>
  );
}

/**
 * Agregar y quitar vaults sin tocar un archivo a mano.
 *
 * Dos formularios separados y NO uno con un modo: quitar es destructivo de la
 * configuración y agregar no, y mezclarlos hace que un enter en el lugar
 * equivocado borre algo.
 */
export default function Vaults({ marcas }: { marcas: MarcaListada[] }) {
  const [rAgregar, accionAgregar, agregando] = useActionState(agregarVault, INICIAL);
  const [rQuitar, accionQuitar, quitando] = useActionState(quitarVault, INICIAL);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-medium">Vaults declarados</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Cada uno es una marca con su ruta en la URL. Salen de{' '}
            <code>config/sources.json</code>.
          </p>

          <div className="mt-4 divide-y divide-border">
            {marcas.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">
                    {m.label} <code className="ml-1 text-[11px] text-muted-foreground">/{m.id}</code>
                  </div>
                  <div className="break-all text-[11px] text-muted-foreground">
                    {m.vault} · {m.content}
                  </div>
                </div>

                {confirmando === m.id ? (
                  <form action={accionQuitar} className="flex items-center gap-2">
                    <input type="hidden" name="quitar_id" value={m.id} />
                    <span className="text-[11px] text-muted-foreground">
                      ¿Seguro? Sus archivos no se tocan.
                    </span>
                    <Button type="submit" size="sm" variant="outline" disabled={quitando}>
                      {quitando ? 'Quitando…' : 'Sí, quitar'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
                      No
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmando(m.id)}
                    disabled={marcas.length <= 1}
                    title={marcas.length <= 1 ? 'Es el único: quitarlo dejaría la app sin fuentes.' : undefined}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Mensaje r={rQuitar} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-medium">Agregar un vault</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Se valida antes de escribir: que la ruta exista, que la subcarpeta exista adentro,
            y que el id sirva como segmento de URL.
          </p>

          <form action={accionAgregar} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] text-muted-foreground">
              id
              <Input name="nuevo_id" placeholder="marca-nueva" className="mt-1 h-8 text-xs" required />
              <span className="mt-1 block text-[10px] text-muted-foreground/70">
                minúsculas. Va en la URL: <code>/marca-nueva</code>
              </span>
            </label>
            <label className="text-[11px] text-muted-foreground">
              nombre visible
              <Input name="nuevo_label" placeholder="Marca Nueva" className="mt-1 h-8 text-xs" required />
            </label>
            <label className="text-[11px] text-muted-foreground">
              ruta del vault
              <Input name="nuevo_vault" placeholder="~/vaults/marca-nueva" className="mt-1 h-8 text-xs" required />
              <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground/70">
                Por <code>~/vaults/</code>, que es un symlink estable. Una ruta real se rompe
                en silencio cuando la carpeta se renombra.
              </span>
            </label>
            <label className="text-[11px] text-muted-foreground">
              subcarpeta con las piezas
              <Input name="nuevo_content" placeholder="Content/Create" className="mt-1 h-8 text-xs" required />
            </label>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={agregando}>
                {agregando ? 'Agregando…' : 'Agregar'}
              </Button>
              <Mensaje r={rAgregar} />
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        Quitar un vault <strong>no borra ni un archivo</strong>: saca su configuración y nada
        más. Y después de cualquiera de las dos cosas hay que{' '}
        <strong>reiniciar el servidor</strong> — el registro de fuentes se arma al arrancar.
      </p>
    </div>
  );
}
