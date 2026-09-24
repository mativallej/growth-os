# Tasks

> Requiere `account-scoped-routes` cerrado.

## 1. Los rollups (puros, testeables sin UI)

- [ ] 1.1 `src/lib/rollups.ts`: `cadenceByMonth` (devuelve además las sin fecha), `analyticsDebt`, `formulaUsage`, `rankBy`. Sin I/O. Verifica: tests de vitest con fixtures sintéticos, incluyendo el caso de "todo sin fecha".
- [ ] 1.2 Test explícito de que una métrica ausente no se convierte en cero en ningún rollup.

## 2. El catálogo de fórmulas

- [ ] 2.1 `src/lib/formulas.ts`: leer el catálogo del vault personal por env (`CATALOG_DIR`), con constante de fallback. **No usa `assertRoots`**: el catálogo puede faltar.
- [ ] 2.2 `formulaCodeOf` en cascada — tag del catálogo → primer token del campo fórmula si matchea el patrón → carpeta → sin clasificar. Verifica: test de que una pieza ambigua cae en sin clasificar y no se le fuerza código.
- [ ] 2.3 Verificar que el catálogo alimenta a las dos marcas y que **no arrastra cuerpo de piezas** — es el único dato que cruza la frontera. Correr el test de aislamiento después de esto.

## 3. Las vistas

- [ ] 3.1 Cadencia: barras por mes con la banda del objetivo, y el contador de sin fecha al lado. Para Tegu van a ser ~109 de 128: **que se lea como hallazgo**.
- [ ] 3.2 Deuda: ordenada por días desde la publicación, separando pendiente de sin trackear, y marcando las publicadas sin enlace. Es la vista que más valor entrega el día uno.
- [ ] 3.3 Fórmulas: uso por código incluyendo los de uso cero, más el bucket sin clasificar.
- [ ] 3.4 Ranking: toggle de métrica, con absoluto y tasa sobre alcance primario.

## 4. Diseño de los vacíos

- [ ] 4.1 Revisar las cuatro vistas con los datos reales de **las dos** marcas. Cualquier vista que con datos reales parezca rota tiene que reescribir su empty state antes de cerrar.
- [ ] 4.2 Verificar en ancho de teléfono: sin scroll horizontal.

## 5. Cerrar

- [ ] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 5.2 Test de aislamiento de cuentas otra vez — este change agrega una fuente compartida entre marcas.
