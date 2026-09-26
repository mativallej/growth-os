# Tasks

## 1. Desbloquear el repo

- [x] 1.1 `npm install` — hoy no existe `node_modules` y nada corre.
- [x] 1.2 Agregar `vitest` a devDependencies y el script `"test": "vitest run"` en `package.json`. Verifica: `npm test` corre (sin tests todavía) sin error.
- [x] 1.3 Renombrar `package.json:2` de `tegu-growth` a `growth-loop`. Verifica: `grep -n '"name"' package.json`.
- [x] 1.4 **Guardar el baseline de slugs ANTES de tocar nada**: correr el parser actual contra `~/vaults/tegu-growth/Brand/Content/Create` con `VAULT_CONTENT_DIR`, volcar los slugs ordenados a `openspec/changes/fail-loud-sources/slugs-baseline.txt`. Es la red de seguridad del change siguiente.

## 2. El registro de fuentes

- [x] 2.1 Crear `src/lib/sources.ts` con el tipo de fuente (id, label, raíces absolutas, ignores) y el registro de las dos marcas. Raíces por defecto vía `~/vaults/*`, overridables por env.
- [x] 2.2 `assertRoots()` que tira nombrando la raíz faltante. Verifica: `VAULT_PERSONAL_DIR=/no/existe npm run build` **tiene que romper**.
- [x] 2.3 `listSources()` filtrando por `GROWTH_SOURCES`, con error que lista las fuentes válidas si se nombra una inexistente. Verifica: test de vitest sobre las dos ramas.
- [x] 2.4 Sacar la const `VAULT` de `src/lib/parse.ts:8-9`; `loadPieces` recibe las fuentes en vez de resolverlas. Mantener `VAULT_CONTENT_DIR` como alias de la raíz de Tegu.

## 3. La auditoría

- [x] 3.1 Crear `scripts/audit-vaults.mjs` (Node puro, sin dependencias nuevas) y el script `"audit"` en `package.json`. Verifica: `npm run audit` imprime conteos por fuente.
- [x] 3.2 Agregar el chequeo de colisión de slugs entre fuentes al audit.
- [x] 3.3 Confirmar que el audit no escribe: correr, y verificar `git -C ~/vaults/brain status --short` y `git -C ~/vaults/tegu-growth status --short` sin cambios.

## 4. Cerrar

- [x] 4.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 4.2 Dejar en este archivo, con fecha, qué quedó hecho y los conteos que devolvió el primer `npm run audit` — es la línea de base de todo lo que sigue.

---

# Cierre — 2026-09-24

**Hecho, todo.** Las cuatro tandas cerraron. El repo corre, el dashboard buildea con
contenido real, y una fuente ausente ahora voltea el build en vez de devolver cero.

## El número que resume el change

`npm run build` pasó de **0 piezas** a **212** (99 de Tegu + 113 personales), 217
páginas estáticas. Antes buildeaba vacío y no se quejaba: `parse.ts:9` resolvía
`../tegu-docs/Brand/Content` contra `process.cwd()`, ese directorio no existe, y
`fg.sync` sobre un directorio inexistente devuelve `[]`.

## La primera corrida de `npm run audit` — la línea de base

```
tegu · Tegu
  vault   ~/vaults/tegu-growth
  raíz    Create/Organic
  archivos .md          106
  con footer            100
  piezas para el parser 99    ← 1 con footer que el parser descarta
  con métricas          14
  con fecha             0
  sin metadata          6

personal · Marca personal
  vault   ~/vaults/brain
  raíz    Personal Brand/Content/Create
  archivos .md          152
  con footer            117
  piezas para el parser 113   ← 4 con footer que el parser descarta
  con métricas          58
  con fecha             93
  sin metadata          35

Claves desconocidas por frecuencia (149 distintas)
  98    distribucion                    tegu
  77    referencias                     tegu, personal
  77    likes                           personal
  70    impressions                     personal
  68    engagements                     personal
  66    reposts                         personal
  64    bookmarks                       personal
  64    replies                         personal
  60    media                           tegu, personal
  27    post-publicación                tegu, personal
  …

Colisión de slugs entre fuentes (0)
  ninguna — cada pieza tiene su propia URL
```

Tres cosas que este corte deja a la vista y que **no** son de este change:

1. **Tegu tiene 0 piezas con `date`.** Escribe la fecha adentro de `estado:
   Publicado 2026-07-22`, no como campo. El parser no la ve. Es `footer-contract-parser`.
2. **`likes` / `impressions` / `engagements` / `bookmarks` aparecen como claves
   desconocidas en el vault personal** — son campos base de métrica, que el
   contrato prohíbe justamente porque envejecen (`docs/footer-contract.md`). 70
   archivos los tienen.
3. **Solo 14 de 99 piezas de Tegu tienen cortes.** No es un bug del lector: no están
   medidas.

## Diff de slugs contra el baseline: vacío

212 slugs antes, 212 después, **ninguno se movió**. `slugify` no se tocó, y el slug
se sigue calculando sobre la ruta relativa al *content root* — no al vault — para
que ninguna URL se corra. Los slugs con guion donde va un acento
(`x4-builder-n-mero`) siguen igual, a propósito.

Reproducir el diff en el change siguiente: el volcado ya no se puede hacer con
`node --experimental-strip-types` (desde 2.4 `parse.ts` importa `./sources` sin
extensión, que Node ESM no resuelve). Va por el runner: un test temporal que llame
a `loadPiecesBySource()` y escriba los slugs ordenados.

## Lo que se decidió sobre la marcha

- **La tarea 1.4 nombra una ruta que no existe.** `~/vaults/tegu-growth/Brand/Content/Create`
  se fue del vault; el content root de Tegu hoy es `Create/Organic`, que es lo que
  declara `config/sources.json` desde el commit `4e0a6c2`. El baseline se tomó contra
  el root real, y quedó anotado en el encabezado del archivo.
- **Las rutas NO se duplicaron en TypeScript.** `src/lib/sources.ts` lee
  `config/sources.json`, el mismo archivo que leen `sync-notion.py` e
  `ingest-analytics.py`. Dos listas de rutas separándose es el bug que este change
  vino a sacar. Lo que sí se repite en los tres lenguajes es la resolución (expandir
  `~`, aplicar el override de env), y está comentado en los tres.
- **`personal` es el id de la fuente; `mativallej` el de la marca.** El id de fuente
  sale del proposal (`GROWTH_SOURCES=tegu,personal`), el de marca de
  `config/sources.json`. El mapeo entre los dos es una línea del `REGISTRY` en
  `sources.ts` — no se duplicó nada más.
- **`relPath` pasó a colgar del vault, no del content root** (`Create/Organic/X/foo.md`
  en vez de `X/foo.md`). Es lo que permite distinguir de qué raíz vino una pieza
  cuando una fuente declara varias. El slug **no** cambió. La contracara es que dos
  fuentes podrían producir el mismo slug: eso lo reporta el audit, y hoy da 0.
- **El `catch {}` de `loadPieces` se fue.** Un archivo que no se puede leer ahora
  rompe nombrando el archivo y la fuente. Antes la pieza desaparecía sin rastro.
- **`next lint` ya no existe.** Se removió en Next 16
  (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md:122`),
  así que `"lint": "next lint"` era un comando muerto. Ahora es `eslint .` con
  `eslint.config.mjs` (flat config) y `eslint` + `eslint-config-next` en devDeps. Sin
  esto la tarea 4.1 no se podía correr.
- **`README.md` y el comentario de `next.config.ts`** documentaban el path roto y el
  nombre viejo. Se actualizaron: quedarse con el rename a medias contradecía el change.

## Lo que quedó fuera, y por qué

- **`npm test` con cero tests sale 1, no 0.** La tarea 1.2 lo pedía verde en vacío;
  vitest 5 sale 1 cuando no encuentra archivos de test, por diseño. Se verificó que
  el runner corre (`npx vitest run --passWithNoTests` → 0) y se dejó el script
  estricto: un `--passWithNoTests` escondería que alguien borró la suite, que es
  precisamente el tipo de silencio que este change vino a sacar. Desde 2.3 hay 14
  tests y `npm test` sale 0.
- **`npm audit` reporta 2 vulnerabilidades (1 high, 1 critical)** en el árbol recién
  instalado. No se tocó: cambiar versiones no es este change.
- **`postcss.config.mjs` tira 1 warning de lint** (`import/no-anonymous-default-export`).
  Preexistente, no es error, no se tocó.

## El chequeo de privacidad

`GROWTH_SOURCES=tegu npm run build` → 104 páginas, 99 piezas, **ninguna personal**:
cero archivos de `.next` mencionan un slug del vault personal.

Pero hay un rastro que conviene mirar en `account-scoped-routes`: **2 archivos de
`.next/server/` contienen `~/vaults/brain` y `Personal Brand`**, porque
`sources.ts` importa `config/sources.json` entero y el bundler lo inlinea — con las
dos marcas adentro, aunque solo se lea una. No es contenido personal, es el
registro; y es server-side, no llega a ningún chunk de cliente (0 archivos en
`static/chunks`). Igual: mientras el registro viaje completo, el aislamiento
**sigue sin estar garantizado**, tal como dice el proposal. **Este build no se
comparte hasta que cierre el change 3.**

## Estado de las verificaciones

| comando | resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` | 0 errores, 1 warning preexistente |
| `npm test` | 14 tests, 1 archivo, todo verde |
| `npm run build` | 217 páginas, 212 piezas |
| `VAULT_PERSONAL_DIR=/no/existe npm run build` | **rompe**, nombrando `/no/existe/Personal Brand/Content/Create` y la env var |
| `npm run audit` | imprime los conteos de arriba, 0 colisiones |
| build desde `/` (`node_modules/.bin/next build <repo>`) | mismas 217 páginas — las fuentes no dependen del `cwd` |
| `node scripts/audit-vaults.mjs` desde `/` y desde `~` | salida idéntica byte a byte |
| audit read-only | `git status` de los dos vaults sin cambios; mtime y tamaño de los 286 `.md` idénticos antes y después |
