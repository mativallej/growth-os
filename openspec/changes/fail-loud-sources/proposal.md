# Proposal

## Why

`src/lib/parse.ts:8-9` resuelve el contenido así:

```ts
const VAULT = process.env.VAULT_CONTENT_DIR
  ?? resolve(process.cwd(), '../tegu-docs/Brand/Content');
```

Ese path está roto por **dos** motivos acumulados, y ninguno de los dos avisa:

1. Es relativo a `process.cwd()`. El repo se movió a `~/Desktop/pro/growth-loop-obsidian`, así que resuelve a `~/Desktop/pro/tegu-docs/Brand/Content`.
2. `Brand/` **ya no vive en tegu-docs**: se mudó a `tegu-growth` el 2026-09-23. Aunque el path relativo fuera correcto, apuntaría a un directorio que no existe.

`fg.sync` sobre un directorio inexistente devuelve `[]` sin lanzar (`src/lib/parse.ts:189`), y el `catch {}` de `loadPieces` (`src/lib/parse.ts:195`) se traga cualquier otro error. **El dashboard buildea vacío, sin un solo warning.** Verificado el 2026-09-24: `ls ~/Desktop/pro/tegu-docs` → no existe.

Tres problemas más del mismo bloque:

- **Una sola fuente.** `VAULT` es un path único. Hoy hay dos marcas en cuatro raíces: `~/vaults/brain` en `Personal Brand/Content/Create`, y `~/vaults/tegu-growth` en `Brand/Content/Create` **y** `Create/` (dos pipelines conviviendo, el propio y el del contractor externo).
- **`npm install` nunca se corrió** — no hay `node_modules`. El repo no arranca.
- **No hay runner de tests.** `package.json` no tiene script `test` ni ningún `*.test.ts`. La regla de specs de este proyecto exige que todo requirement sea chequeable; hoy no hay con qué.

Y `package.json:2` todavía dice `"name": "tegu-growth"`, que es el repo del que salió.

**Por qué este change primero.** Todos los demás (parser, rutas, vistas) tocan datos que hoy no se están leyendo. Medir o rediseñar sobre un array vacío no verifica nada.

## What Changes

- **Nuevo `src/lib/sources.ts`**, que reemplaza la const `VAULT` (exportada, sin consumidores hoy). Registro tipado de fuentes: cada una con su id, label, raíces absolutas y prefijos a ignorar.
- Los paths salen de env vars con default a `~/vaults/<nombre>`, **nunca relativos a `process.cwd()`**. `VAULT_CONTENT_DIR` queda como alias retrocompatible de la raíz de Tegu.
- **`assertRoots()` tira si falta una raíz en disco.** Preferimos un build roto a un dashboard vacío.
- **`GROWTH_SOURCES`** (CSV, default `tegu,personal`) define qué fuentes entran al build. Es la palanca de privacidad que después usan los dos deploys.
- **Nuevo `scripts/audit-vaults.mjs`** (`npm run audit`, read-only): por fuente imprime archivos totales, con footer, con métricas, con fecha, sin metadata, las claves desconocidas por frecuencia, y el chequeo de colisión de slugs.
- `npm install`, runner de tests (`vitest`) con `npm test`, y rename de `package.json` a `growth-loop`.
- **Baseline de slugs guardado antes de tocar nada**, para diffear en el change siguiente.

**No incluye:** cambiar el parser, las rutas ni las vistas. Este change deja de mentir; leer bien es el siguiente.

## Capabilities

### New Capabilities

- `content-sources`: de dónde salen las piezas, cómo se declara cada fuente, qué pasa cuando una falta, y cómo se recorta el conjunto de fuentes de un build.

### Modified Capabilities

*(ninguna — es el primer change del repo)*

## Impact

**Código.** `src/lib/sources.ts` (nuevo) · `src/lib/parse.ts` (deja de resolver el path, lo recibe) · `scripts/audit-vaults.mjs` (nuevo) · `package.json` (nombre, `test`, `audit`, devDeps de vitest).

**Datos.** Ninguno: es read-only sobre los vaults. Ningún `.md` se toca.

**Privacidad.** Toca las dos marcas. `GROWTH_SOURCES` se introduce acá pero recién se usa como frontera real en `account-scoped-routes`; hasta entonces el aislamiento **no está garantizado** y el deploy no debe compartirse.

**Riesgo.** `assertRoots()` convierte un fallo silencioso en un build roto. Es deliberado, pero significa que un vault desmontado o un symlink roto voltea el build. Aceptado: el símbolo de que algo está mal tiene que ser visible.
