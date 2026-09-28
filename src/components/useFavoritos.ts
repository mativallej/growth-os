"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
 *
 * ESTE ARCHIVO NO SABE QUÉ ES SUPABASE, Y ESO ES EL PUNTO. Habló con PostgREST
 * directo por unas horas, lo que obligaba a que la URL y la clave del proyecto
 * estuvieran en el bundle de cliente. Ahora pega contra `/api/favoritos`, del
 * mismo origen: no hay credenciales que mandar, no hay JWT que pedir, y el
 * `user_id` lo pone el servidor desde la sesión en vez de viajar en el body.
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
/** Lo que devuelve GET /api/favoritos: las filas, y quién las está pidiendo. */
type Respuesta = { yo: string; filas: Fila[] };

const API = "/api/favoritos";

/** El error del endpoint, que trae el motivo, y no un "HTTP 500" pelado. */
async function fallo(r: Response): Promise<string> {
  const cuerpo = await r.text().catch(() => "");
  try {
    const j = JSON.parse(cuerpo) as { error?: string };
    if (j.error) return j.error;
  } catch {
    // No era JSON: sirve el texto crudo, recortado.
  }
  return `HTTP ${r.status} ${cuerpo.slice(0, 160)}`;
}

// SIN PARÁMETRO DE MARCA. Lo tenía —`useFavoritos(account)`— porque con
// `localStorage` la clave se prefijaba con la marca para que dos no se pisaran en
// el mismo navegador. Ahora la marca es la instalación: la base a la que apunta
// este deploy tiene una sola, y pasarle el `account` sugeriría que puede haber otra.
export function useFavoritos(): Favoritos {
  const [filas, setFilas] = useState<Fila[]>([]);
  // Quién soy, SEGÚN EL SERVIDOR. Viene en la misma respuesta que las filas, y no
  // de preguntarle a Clerk en el cliente: hace falta para separar los favoritos
  // propios de los ajenos, y dos fuentes para el mismo dato pueden discrepar.
  const [yo, setYo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(API, { cache: "no-store" });
    if (!r.ok) throw new Error(await fallo(r));
    const { yo: quien, filas: datos } = (await r.json()) as Respuesta;
    setYo(quien);
    setFilas(datos);
    return quien;
  }, []);

  // La carga es async, así que el setState NO es sincrónico dentro del efecto:
  // eso es lo que el React Compiler rechaza, y por lo que este hook usaba
  // `useSyncExternalStore` cuando leía `localStorage`. Una lectura remota no
  // entra en ese patrón —no hay snapshot que comparar con `===`— y no hace falta.
  useEffect(() => {
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
  }, [cargar]);

  const favoritos = useMemo(
    () => new Set(filas.filter((f) => f.user_id === yo).map((f) => f.piece_id)),
    [filas, yo],
  );

  const quienes = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const f of filas) {
      if (f.user_id === yo) continue; // los propios ya los dice la estrella
      m.set(f.piece_id, [...(m.get(f.piece_id) ?? []), f.user_label ?? "alguien"]);
    }
    return m;
  }, [filas, yo]);

  const alternar = useCallback(
    (llave: string) => {
      // Sin saber quién soy no se puede pintar el optimismo en el lugar correcto.
      // Pasa solo en el instante entre el primer render y la primera respuesta;
      // el click igual se manda, y el `cargar()` posterior lo refleja.
      const estaba = favoritos.has(llave);

      // OPTIMISTA: la estrella responde en el momento y la red va atrás. Un
      // favorito es una preferencia personal, no una transacción — esperar 200ms
      // a que vuelva el servidor para pintar una estrella se siente roto.
      if (yo) {
        setFilas((antes) =>
          estaba
            ? antes.filter((f) => !(f.piece_id === llave && f.user_id === yo))
            : [...antes, { piece_id: llave, user_id: yo, user_label: null }],
        );
      }

      void (async () => {
        try {
          const r = estaba
            ? await fetch(`${API}?pieceId=${encodeURIComponent(llave)}`, { method: "DELETE" })
            : await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pieceId: llave }),
              });
          if (!r.ok) throw new Error(await fallo(r));
          // Se relee para quedarse con lo que el servidor guardó de verdad, que
          // además trae la etiqueta con el nombre de quien marcó.
          await cargar();
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
    [yo, favoritos, cargar],
  );

  return { favoritos, alternar, quienes, error };
}
