# Tasks

> **Desbloquea `move-resilient-keys` y D-15.** Los dos están parados esperando una
> llave estable.

> **No correr el backfill contra un vault en movimiento.** Es la lección del intento
> del 2026-09-24 17:40: se escribieron 14 rutas que estaban muertas minutos después
> porque otra sesión reorganizaba en paralelo. El backfill verifica árbol limpio antes
> de escribir, y esa verificación es un requirement, no una precaución.

## 1 · Decidir la forma

- [x] Definir el alfabeto y el largo del identificador. **Lo decide Matías.** La única
      restricción del spec es que sea opaco. Dejar el porqué en `DECISIONS.md`.
- [x] Definir la clave del footer que lo lleva, coherente con el contrato de una clave
      por línea. Verifica: `docs/footer-contract.md` actualizado.

## 2 · Lectura

- [x] `src/lib/types.ts` — `Piece` suma el identificador, opcional.
      Verifica: `npx tsc --noEmit`.
- [x] `src/lib/footer.ts` — leer la clave del identificador. Reusar el tokenizer de
      `footer-contract-parser`, no escribir otro.
      Verifica: test con una pieza con id y otra sin.
- [x] Reportar en el resumen de carga cuántas piezas no tienen id.
      Verifica: `npm run audit`.
- [x] Detectar ids repetidos y reportar las dos rutas.
      Verifica: test con dos piezas del mismo id.

## 3 · Backfill

- [x] `scripts/backfill-piece-id.py` — asigna id a las piezas que no tienen.
      **Dry-run por default**, como el resto de `scripts/`.
      Verifica: dry-run sobre los dos vaults, contra ~265 piezas.
- [x] El backfill aborta si el vault tiene cambios sin commitear.
      Verifica: correrlo con el árbol sucio y ver que no escribe.
- [x] Idempotente: correrlo dos veces no reasigna nada.
      Verifica: dos corridas seguidas, diff vacío en la segunda.
- [ ] Un commit por vault, reversible.

## 4 · Puente con Notion

- [x] `scripts/sync-notion.py` — llavear por id, ruta como dato informativo.
      Hoy la llave es la ruta relativa (columna `Archivo`).
      Verifica: dry-run sobre una pieza movida, empareja igual.
- [x] Reportar las filas anteriores al cambio como pendientes de re-llavear, sin caer
      a emparejar por ruta en silencio.
      Verifica: dry-run contra las 57 filas de `move-resilient-keys`.

## Fuera de alcance — dependencia externa

La asignación **al crear** una pieza la hacen `growth-post` y `brain-post`, que son
skills de los vaults. Este repo no las toca: su backfill cubre lo existente, y las
piezas nuevas nacerán sin id hasta que ese cambio se haga allá.

Consecuencia aceptada: entre el backfill y ese cambio, el reporte de piezas sin id va
a crecer con cada pieza nueva. Es visible, que es lo que pide la REGLA DURA 1.

## Cierre

- [x] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] Baseline de slugs antes y después. **No tocar `slugify`** — el id es un campo del
      footer, no la ruta.
- [x] Grep de privacidad antes de cerrar.
- [x] Dejar escrito acá qué quedó hecho y qué no, con fecha.

---

# Cierre — 2026-09-26

**Aplicado todo lo que no depende de terceros. Dos cosas quedan bloqueadas y son
las dos que escriben afuera de este repo.**

`tsc` · `lint` (0 errores) · **131 tests** (eran 121) · build de 295 páginas.

## La forma del identificador (D-9, decidida por Matías)

**8 caracteres de un alfabeto de 31**: `23456789abcdefghjkmnpqrstuvwxyz`. Sin
`0`/`O` ni `1`/`l`/`i`, que son los que se confunden al dictar o transcribir a
mano. 31⁸ ≈ 8,5 × 10¹¹ — con 295 piezas, la probabilidad de colisión por azar es
del orden de 10⁻⁸.

**Ids repetidos: se reportan y se corta.** No se renumera solo. Elegir una de las
dos en silencio es la clase de decisión que dejó 57 filas apuntando al archivo
equivocado, y renumerar automáticamente pondría a la app a decidir sobre la
identidad de una pieza. El razonamiento completo quedó en `DECISIONS.md`.

## Lo que quedó andando

| | |
|---|---|
| `docs/footer-contract.md` | `id` es el primer campo de identidad del contrato |
| `src/lib/footer.ts` | lee `id` en las dos gramáticas, reusando el tokenizer |
| `src/lib/parse.ts` | `findDuplicateIds` + `withoutId` y `duplicateIds` por fuente |
| `npm run audit` | reporta piezas sin id y colisiones con las dos rutas |
| `scripts/backfill-piece-id.py` | dry-run por default, aborta con el vault sucio, idempotente |
| `scripts/sync-notion.py` | llavea por `ID`; `Archivo` pasa a dato informativo |

**El backfill escribe en el estilo que cada archivo ya usa** — `- id: x` donde el
footer es de bullets, `id: x` donde es inline. Meter un bullet en un footer
inline sería reformatear el vault, y eso no se hace.

## Verificado a mano, sobre un repo git temporal

| qué | resultado |
|---|---|
| árbol limpio → escribe | 3 piezas, 1 ya tenía id, **2 escritas** |
| respeta la gramática de cada archivo | `- id:` en el de bullets, `id:` en el inline |
| segunda corrida → idempotente | `3 ya tienen id · 0 sin id`, **diff vacío** |
| árbol sucio → aborta | **verificado contra los dos vaults reales**: abortó en los dos y `git status` quedó idéntico antes y después |

## Los dos bloqueos

**1 · El backfill no se corrió.** Los dos vaults tienen cambios sin commitear
(brain 10 archivos, tegu-growth 4, incluido un rename en vuelo). El script
aborta, que es lo que el spec pide, y **no se forzó**: esos cambios son trabajo
del humano, no de esta sesión. Para desbloquear:

```bash
# en cada vault, commitear o descartar lo pendiente. Después:
python3 scripts/backfill-piece-id.py --brand all              # dry-run
python3 scripts/backfill-piece-id.py --brand all --apply      # escribe
```

Al 2026-09-26 asignaría **275 ids** (135 personal + 140 tegu). Quedan afuera **20
piezas sin footer** (19 personal + 1 tegu): crearles uno es más que asignar un id,
así que necesita `--crear-footer` explícito.

**2 · El puente con Notion no se pudo verificar.** El código llavea por `ID` y
está escrito, pero:

- La integración `growth-loop` existe y el token es válido (`.env.local`,
  `chmod 600`), **pero la página Growth no está compartida con ella**: la API
  devuelve 0 objetos visibles. Falta el paso de Notion → Growth → `⋯` →
  Connections → Connect to → `growth-loop`.
- Falta **crear la columna `ID`** (rich text) en `Content Creator` y en
  `Ads Creator`. Sin ella todas las filas se van a reportar como pendientes de
  re-llavear, que es el comportamiento correcto pero no el deseado.

Mientras tanto el dry-run corta con un 400 de Notion, que es honesto: no hay
acceso, no hay emparejamiento.

## Fuera de alcance, y se confirma

Las piezas NUEVAS van a nacer sin id hasta que se toquen `growth-post` y
`brain-post`, que son skills de los vaults. El contador de "sin identificador"
del audit va a crecer con cada pieza nueva, y eso es lo que pide la REGLA DURA 1:
la deuda a la vista.

## El grep de privacidad

Con el build completo, el contenido personal viaja (618 archivos con
`Personal Brand`, 52 con una sonda del contenido personal). **No lo introdujo este change** — es la
condición que documenta el README y que cierra `account-scoped-routes`.

Con `GROWTH_SOURCES=tegu` baja a 2 y 4, y los residuos son benignos:

- los 4 de la sonda personal son **una pieza de Tegu** cuya propia nota dice que
  ese tema va en la marca personal y no ahí. O sea: contenido de Tegu hablando de
  dónde NO va algo.
- los 2 de `Personal Brand` son el registro de `config/sources.json` inlineado en
  el chunk de servidor — rutas de configuración, no contenido.

**Ningún contenido personal se filtra con el recorte puesto.** El registro sí, y
es exactamente lo que falta cerrar.

## Slugs

Sin cambios: el id es un campo del footer, no la ruta. `slugify` no se tocó.
