"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { configSupabase, headers, respuesta } from "@/lib/supabase";

/**
 * Favoritos, COMPARTIDOS entre las personas que usan esta instalación.
 *
 * Hasta el 2026-09-28 vivían en `localStorage`, y el comentario de este archivo
 * defendía esa decisión así: *"no vive en un servidor porque entonces los
 * favoritos de un externo estarían en la misma tabla que los míos"*.
 *
 * Esa objeción la responde D-17: **una instalación es una marca**. Los favoritos
 * de un externo están en la base de SU marca, que es otro proyecto de Supabase al
 * que este deploy no tiene credenciales. No comparten tabla porque no comparten
 * base.
 *
 * Y lo que se gana es lo que el dueño pidió: que marcar una pieza le sirva a
 * quien trabaja con él. Todos ven los de todos —por eso `quienes`— y cada uno
 * solo escribe los suyos, que es una policy de RLS y no un chequeo de la app.
 *
 * LA LLAVE SIGUE SIENDO EL `id` DEL FOOTER, no el slug: mover un `.md` de carpeta
 * le cambia el slug, y un favorito guardado por slug se perdería sin avisar. Eso
 * ya era la intención documentada acá; D-9 la hizo real.
 */

export type Favoritos = {
  favoritos: Set<string>;
  alternar: (llave: string) => void;
  /** Quién marcó cada pieza. Vacío para las que solo marcó uno mismo. */
  quienes: Map<string, string[]>;
  /** Lo que salió mal, para poder decirlo en vez de mostrar una lista vacía. */
  error: string | null;
};

type Fila = { piece_id: string; user_id: string; user_label: string | null };

const RECURSO = "favoritos";

export function useFavoritos(_account: string): Favoritos {
  const { getToken, userId, isLoaded } = useAuth();
  const cfg = useMemo(() => configSupabase(), []);

  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!cfg) return;
    const token = await getToken();
    const r = await fetch(
      `${cfg.url}/rest/v1/${RECURSO}?select=piece_id,user_id,user_label`,
      { headers: headers({ ...cfg, token }), cache: "no-store" },
    );
    setFilas(await respuesta<Fila[]>(r, "favoritos"));
  }, [cfg, getToken]);

  // La carga es async, así que el setState NO es sincrónico dentro del efecto:
  // eso es lo que el React Compiler rechaza, y por lo que este hook usaba
  // `useSyncExternalStore` cuando leía `localStorage`. Una lectura remota no
  // entra en ese patrón —no hay snapshot que comparar con `===`— y no hace falta.
  useEffect(() => {
    if (!isLoaded || !cfg) return;
    let vivo = true;
    // El trabajo va adentro de una función async invocada al toque, y no en un
    // `cargar().catch(...)`: el compilador no puede ver a través del `useCallback`
    // que el `setState` ocurre DESPUÉS de un await, y lo marca como sincrónico.
    // Así queda explícito, y además el guard `vivo` cubre las dos ramas.
    void (async () => {
      try {
        await cargar();
        if (vivo) setError(null);
      } catch (e: unknown) {
        if (vivo) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [isLoaded, cfg, cargar]);

  const favoritos = useMemo(
    () => new Set(filas.filter((f) => f.user_id === userId).map((f) => f.piece_id)),
    [filas, userId],
  );

  const quienes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const f of filas) {
      if (f.user_id === userId) continue; // los propios ya los dice la estrella
      m.set(f.piece_id, [...(m.get(f.piece_id) ?? []), f.user_label ?? "alguien"]);
    }
    return m;
  }, [filas, userId]);

  const alternar = useCallback(
    (llave: string) => {
      if (!cfg || !userId) return;
      const estaba = favoritos.has(llave);

      // OPTIMISTA: la estrella responde en el momento y la red va atrás. Un
      // favorito es una preferencia personal, no una transacción — esperar 200ms
      // a que vuelva el servidor para pintar una estrella se siente roto.
      setFilas((antes) =>
        estaba
          ? antes.filter((f) => !(f.piece_id === llave && f.user_id === userId))
          : [...antes, { piece_id: llave, user_id: userId, user_label: null }],
      );

      void (async () => {
        try {
          const token = await getToken();
          const h = headers({ ...cfg, token }, { "Content-Type": "application/json" });
          const r = estaba
            ? await fetch(
                `${cfg.url}/rest/v1/${RECURSO}?piece_id=eq.${encodeURIComponent(llave)}&user_id=eq.${encodeURIComponent(userId)}`,
                { method: "DELETE", headers: h },
              )
            : await fetch(`${cfg.url}/rest/v1/${RECURSO}`, {
                method: "POST",
                headers: h,
                body: JSON.stringify({ piece_id: llave, user_id: userId }),
              });
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 160)}`);
          setError(null);
        } catch (e: unknown) {
          // Se revierte lo optimista. Dejar la estrella encendida sobre algo que
          // no se guardó es peor que el parpadeo: el próximo refresh la apaga y
          // nadie sabe por qué.
          await cargar().catch(() => {});
          setError(
            `No se pudo guardar el favorito: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      })();
    },
    [cfg, userId, favoritos, getToken, cargar],
  );

  return { favoritos, alternar, quienes, error };
}
