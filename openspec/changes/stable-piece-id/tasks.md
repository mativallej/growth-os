# Tasks

> **Desbloquea `move-resilient-keys` y D-15.** Los dos están parados esperando una
> llave estable.

> **No correr el backfill contra un vault en movimiento.** Es la lección del intento
> del 2026-09-24 17:40: se escribieron 14 rutas que estaban muertas minutos después
> porque otra sesión reorganizaba en paralelo. El backfill verifica árbol limpio antes
> de escribir, y esa verificación es un requirement, no una precaución.

## 1 · Decidir la forma

- [ ] Definir el alfabeto y el largo del identificador. **Lo decide Matías.** La única
      restricción del spec es que sea opaco. Dejar el porqué en `DECISIONS.md`.
- [ ] Definir la clave del footer que lo lleva, coherente con el contrato de una clave
      por línea. Verifica: `docs/footer-contract.md` actualizado.

## 2 · Lectura

- [ ] `src/lib/types.ts` — `Piece` suma el identificador, opcional.
      Verifica: `npx tsc --noEmit`.
- [ ] `src/lib/footer.ts` — leer la clave del identificador. Reusar el tokenizer de
      `footer-contract-parser`, no escribir otro.
      Verifica: test con una pieza con id y otra sin.
- [ ] Reportar en el resumen de carga cuántas piezas no tienen id.
      Verifica: `npm run audit`.
- [ ] Detectar ids repetidos y reportar las dos rutas.
      Verifica: test con dos piezas del mismo id.

## 3 · Backfill

- [ ] `scripts/backfill-piece-id.py` — asigna id a las piezas que no tienen.
      **Dry-run por default**, como el resto de `scripts/`.
      Verifica: dry-run sobre los dos vaults, contra ~265 piezas.
- [ ] El backfill aborta si el vault tiene cambios sin commitear.
      Verifica: correrlo con el árbol sucio y ver que no escribe.
- [ ] Idempotente: correrlo dos veces no reasigna nada.
      Verifica: dos corridas seguidas, diff vacío en la segunda.
- [ ] Un commit por vault, reversible.

## 4 · Puente con Notion

- [ ] `scripts/sync-notion.py` — llavear por id, ruta como dato informativo.
      Hoy la llave es la ruta relativa (columna `Archivo`).
      Verifica: dry-run sobre una pieza movida, empareja igual.
- [ ] Reportar las filas anteriores al cambio como pendientes de re-llavear, sin caer
      a emparejar por ruta en silencio.
      Verifica: dry-run contra las 57 filas de `move-resilient-keys`.

## Fuera de alcance — dependencia externa

La asignación **al crear** una pieza la hacen `growth-post` y `brain-post`, que son
skills de los vaults. Este repo no las toca: su backfill cubre lo existente, y las
piezas nuevas nacerán sin id hasta que ese cambio se haga allá.

Consecuencia aceptada: entre el backfill y ese cambio, el reporte de piezas sin id va
a crecer con cada pieza nueva. Es visible, que es lo que pide la REGLA DURA 1.

## Cierre

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Baseline de slugs antes y después. **No tocar `slugify`** — el id es un campo del
      footer, no la ruta.
- [ ] Grep de privacidad antes de cerrar.
- [ ] Dejar escrito acá qué quedó hecho y qué no, con fecha.
