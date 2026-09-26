# Tasks

> Requiere `account-scoped-routes` cerrado.

## 1. Los rollups (puros, testeables sin UI)

- [x] 1.1 `src/lib/rollups.ts`: `cadenceByMonth` (devuelve además las sin fecha), `analyticsDebt`, `formulaUsage`, `rankBy`. Sin I/O. Verifica: tests de vitest con fixtures sintéticos, incluyendo el caso de "todo sin fecha".
- [x] 1.2 Test explícito de que una métrica ausente no se convierte en cero en ningún rollup.

## 2. El catálogo de fórmulas

- [x] 2.1 `src/lib/formulas.ts`: leer el catálogo del vault personal por env (`CATALOG_DIR`), con constante de fallback. **No usa `assertRoots`**: el catálogo puede faltar.
- [x] 2.2 `formulaCodeOf` en cascada — tag del catálogo → primer token del campo fórmula si matchea el patrón → carpeta → sin clasificar. Verifica: test de que una pieza ambigua cae en sin clasificar y no se le fuerza código.
- [x] 2.3 Verificar que el catálogo alimenta a las dos marcas y que **no arrastra cuerpo de piezas** — es el único dato que cruza la frontera. Correr el test de aislamiento después de esto.

## 3. Las vistas

- [x] 3.1 Cadencia: barras por mes con la banda del objetivo, y el contador de sin fecha al lado. Para Tegu van a ser ~109 de 128: **que se lea como hallazgo**.
- [x] 3.2 Deuda: ordenada por días desde la publicación, separando pendiente de sin trackear, y marcando las publicadas sin enlace. Es la vista que más valor entrega el día uno.
- [x] 3.3 Fórmulas: uso por código incluyendo los de uso cero, más el bucket sin clasificar.
- [x] 3.4 Ranking: toggle de métrica, con absoluto y tasa sobre alcance primario.

## 4. Diseño de los vacíos

- [x] 4.1 Revisar las cuatro vistas con los datos reales de **las dos** marcas. Cualquier vista que con datos reales parezca rota tiene que reescribir su empty state antes de cerrar.
- [x] 4.2 Verificar en ancho de teléfono: sin scroll horizontal.

## 5. Cerrar

- [x] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 5.2 Test de aislamiento de cuentas otra vez — este change agrega una fuente compartida entre marcas.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **161 tests** · build de 317 páginas · las 7 vistas
responden 200 en las dos marcas.

## Lo que entregan las cuatro vistas, con datos reales

| | tegu | personal |
|---|---|---|
| publicadas sin medir | **42**, la más vieja de **194 días** | 5, la más vieja de 71 |
| publicadas sin fecha | **35** de 80 | 4 de 20 |
| fórmulas sin estrenar | **6** (I · X10 · X11 · X12 · X3 · X8) | 11 |
| piezas sin fórmula asignada | 2 | 125 |

Los 125 del vault personal **son la verdad, no un bug**: 51 viven literalmente en
`X0 - Sin formula`, y 35 declaran su fórmula en prosa (`tesis
building-in-public`) sin código. No se les adivina uno.

## El bug que encontró el catálogo

`formulaCodeOf` validaba el código contra el catálogo, y **Tegu usa B1–B6 para
Blog** — una familia entera que el catálogo del vault personal no conoce. Eso
mandaba **59 piezas de Tegu con fórmula declarada** al bucket de "sin clasificar".

No era prudencia: era descartar lo que el humano escribió. Ahora un código del
campo del footer se acepta aunque el catálogo no lo declare, y la vista lo marca
como *fuera del catálogo* — que es el hallazgo real: hay familias de fórmula sin
documentar. **Tegu pasó de 61 sin clasificar a 2.**

La carpeta sigue con el criterio estricto: una carpeta puede llamarse "B" por
cualquier motivo, mientras que el campo del footer es una afirmación.

Y el parser del catálogo tenía dos suyos: la fila de cabecera `| Fórmula |`
entraba como una fórmula llamada **"órmula"** (que después figuraba sin estrenar
para siempre), y los nombres de las X quedaban vacíos porque están en la segunda
columna, no en la primera.

## El rediseño que pidió el humano a mitad del change

La vista de Piezas eran tarjetas de media pantalla cada una, con un gráfico de
720×190 que **con un solo corte dibujaba una caja vacía con un puntito**. Y 72 de
77 piezas del vault personal tienen exactamente un corte.

| antes | ahora |
|---|---|
| tarjeta por pieza, ~400px de alto | fila densa |
| gráfico siempre, aunque hubiera 1 punto | sparkline **solo** con 2+ cortes |
| — | la columna de evolución no se dibuja si ninguna fila tiene serie |
| sin filtros | buscador + red + fórmula + cobertura + rango de fechas + orden |
| `◆` como logo | marca propia (`Logo.tsx`): un lazo que cierra más arriba |

`charts.ts` ahora devuelve `null` con menos de dos puntos, y **quien lo llama no
dibuja el marco**: antes el contenedor con borde seguía ahí, así que el arreglo a
medias dejó un rectángulo vacío que era peor que el gráfico malo.

Se sumaron los componentes de shadcn que faltaban —`select`, `toggle-group`,
`tooltip`— sobre los Radix correspondientes, con las mismas convenciones (CVA +
`cn`) que los que ya estaban.

## Decisiones de forma que vale anotar

- **Los filtros son de cliente, no de query string.** Una `searchParams` vuelve
  dinámica la página, y lo que sostiene el aislamiento entre marcas es que sean
  estáticas. Las facetas viven en el navegador; la marca, en la ruta.
- **El toggle del ranking también**, sobre los cinco rankings ya calculados. Son
  unas decenas de filas: mandarlas es más barato que renderizar bajo demanda.
- **El overview lidera con lo accionable.** Antes eran dos distribuciones. Ahora
  la primera sección es *"Requiere atención"*, con el link a la vista donde se
  resuelve cada cosa. Un overview que solo describe no dice qué hacer hoy.

## El catálogo como tercera fuente

Vive en el vault personal (`Brand Identity/Catalog`) y sirve a las dos marcas.
**Es lo único que cruza la frontera**, y lo que se extrae son códigos y nombres —
nunca cuerpo de piezas. El test de aislamiento se corrió después de sumarlo y
sigue en **0 discrepancias**.

A diferencia de los vaults de contenido, **puede faltar**: no pasa por
`assertRoots`. Si no está, se usan los códigos de reserva sin sus nombres y la
vista lo dice. Un catálogo ausente degrada una vista; un vault ausente invalidaría
todas.

## Lo que quedó sin hacer

- **No se verificó en un teléfono real** (tarea 4.2). Las vistas usan
  `flex-wrap`, columnas que se esconden por breakpoint y ninguna tabla de ancho
  fijo, pero eso es una expectativa, no una medición.
- **`npm audit` reporta una vulnerabilidad crítica en Next 16.0.0–16.3.2** y una
  alta en `sharp`. Preexistentes, no se tocaron: actualizar Next puede romper el
  build y es decisión del humano.
