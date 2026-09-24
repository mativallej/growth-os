# Tasks

## 1. Desbloquear el repo

- [ ] 1.1 `npm install` — hoy no existe `node_modules` y nada corre.
- [ ] 1.2 Agregar `vitest` a devDependencies y el script `"test": "vitest run"` en `package.json`. Verifica: `npm test` corre (sin tests todavía) sin error.
- [ ] 1.3 Renombrar `package.json:2` de `tegu-growth` a `growth-loop`. Verifica: `grep -n '"name"' package.json`.
- [ ] 1.4 **Guardar el baseline de slugs ANTES de tocar nada**: correr el parser actual contra `~/vaults/tegu-growth/Brand/Content/Create` con `VAULT_CONTENT_DIR`, volcar los slugs ordenados a `openspec/changes/fail-loud-sources/slugs-baseline.txt`. Es la red de seguridad del change siguiente.

## 2. El registro de fuentes

- [ ] 2.1 Crear `src/lib/sources.ts` con el tipo de fuente (id, label, raíces absolutas, ignores) y el registro de las dos marcas. Raíces por defecto vía `~/vaults/*`, overridables por env.
- [ ] 2.2 `assertRoots()` que tira nombrando la raíz faltante. Verifica: `VAULT_PERSONAL_DIR=/no/existe npm run build` **tiene que romper**.
- [ ] 2.3 `listSources()` filtrando por `GROWTH_SOURCES`, con error que lista las fuentes válidas si se nombra una inexistente. Verifica: test de vitest sobre las dos ramas.
- [ ] 2.4 Sacar la const `VAULT` de `src/lib/parse.ts:8-9`; `loadPieces` recibe las fuentes en vez de resolverlas. Mantener `VAULT_CONTENT_DIR` como alias de la raíz de Tegu.

## 3. La auditoría

- [ ] 3.1 Crear `scripts/audit-vaults.mjs` (Node puro, sin dependencias nuevas) y el script `"audit"` en `package.json`. Verifica: `npm run audit` imprime conteos por fuente.
- [ ] 3.2 Agregar el chequeo de colisión de slugs entre fuentes al audit.
- [ ] 3.3 Confirmar que el audit no escribe: correr, y verificar `git -C ~/vaults/brain status --short` y `git -C ~/vaults/tegu-growth status --short` sin cambios.

## 4. Cerrar

- [ ] 4.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 4.2 Dejar en este archivo, con fecha, qué quedó hecho y los conteos que devolvió el primer `npm run audit` — es la línea de base de todo lo que sigue.
