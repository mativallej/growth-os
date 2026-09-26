"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type Comando = { id: string; titulo: string; detalle?: string; href: string; grupo: string };

/**
 * ⌘K: ir a cualquier lado y buscar cualquier pieza.
 *
 * Es NAVEGACIÓN, no operación: no dispara nada, así que puede existir en
 * cualquier build. Las acciones que sí ejecutan viven en la consola, que no se
 * compila fuera del entorno local.
 *
 * El índice se arma en el servidor con lo mínimo —título, canal, ruta— y no
 * lleva el cuerpo de ninguna pieza: es de la marca que ya se está mirando, y
 * aun así no hay motivo para mandar texto completo a un buscador.
 */
export default function CommandPalette({ comandos }: { comandos: Comando[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => {
          if (v) return false;
          setQ("");
          setSel(0);
          return true;
        });
      }
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);


  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? comandos.filter((c) => `${c.titulo} ${c.detalle ?? ""}`.toLowerCase().includes(t))
      : comandos.filter((c) => c.grupo !== "Piezas");
    return base.slice(0, 40);
  }, [comandos, q]);

  if (!abierto) return null;

  const ir = (href: string) => {
    setAbierto(false);
    router.push(href);
  };

  let grupoActual = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 p-4 pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar e ir"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-lg"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, resultados.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            }
            if (e.key === "Enter" && resultados[sel]) {
              e.preventDefault();
              ir(resultados[sel].href);
            }
          }}
          placeholder="Ir a una vista o buscar una pieza…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />

        <div className="max-h-[52vh] overflow-y-auto p-1">
          {resultados.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nada coincide con “{q}”.
            </p>
          ) : (
            resultados.map((c, i) => {
              const encabezado = c.grupo !== grupoActual ? ((grupoActual = c.grupo), c.grupo) : null;
              return (
                <div key={c.id}>
                  {encabezado && (
                    <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground/60">
                      {encabezado}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSel(i)}
                    onClick={() => ir(c.href)}
                    className={`flex w-full items-baseline gap-2 rounded-md px-3 py-2 text-left transition-colors ${
                      i === sel ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px]">{c.titulo}</span>
                    {c.detalle && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{c.detalle}</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
