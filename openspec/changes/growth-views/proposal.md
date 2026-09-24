# Proposal

## Why

Desde el 2026-09-23 el tablero operativo vive en Notion: kanban, planificación e
ideas. Eso deja a esta app sin su justificación original, así que hay que decir con
precisión qué aporta que Notion no puede dar.

Notion sí puede: qué se está produciendo, en qué carril, con qué fecha. Es
coordinación y ahí gana.

Notion **no** puede, porque no tiene el catálogo ni las series:

1. **Cadencia contra una dieta.** Piezas por mes contra el objetivo de 10-14, y el conteo explícito de piezas sin fecha. Al 2026-09-24 el digest reporta **4 piezas en 2026-09, faltan 6 para el piso**.
2. **Deuda de medición.** Piezas publicadas sin números, ordenadas por días desde la publicación. El digest reporta **6 publicadas sin números, la más vieja de hace 74 días**. Para Tegu es peor: de 128 piezas parseables, solo **20 tienen cortes numéricos**.
3. **Uso de fórmulas, incluidas las que nunca se estrenaron.** Esto Notion no lo puede hacer ni en principio: el catálogo de fórmulas vive en el vault personal, y una fórmula sin estrenar **no tiene ninguna fila** en ninguna base. Solo se ve cruzando el catálogo contra las piezas.
4. **Ranking por alcance, en absoluto y en tasa.** Ordenar solo por absoluto miente: una pieza de utilidad gana en guardados con impresiones mediocres, y otra gana en impresiones sin mover a nadie.

**Lo que se descarta explícitamente:** duplicar el kanban. Si una vista de acá se
puede resolver con una vista de Notion, va a Notion.

## What Changes

- **Nuevo `src/lib/rollups.ts`**, puro y sin I/O: cadencia por mes, deuda, uso de fórmulas y ranking.
- **Nuevo `src/lib/formulas.ts`**: el catálogo canónico vive en el vault personal y sirve a las dos marcas. Se lee como **tercera fuente read-only**, con fallback si falta — a diferencia de los vaults de contenido, el catálogo puede faltar sin romper el build.
- Cuatro vistas nuevas bajo la ruta de cuenta, construidas con el `BarList` extraído en el change anterior.
- La resolución del código de fórmula va en cascada y **nunca fuerza**: lo que no se puede clasificar va a un bucket declarado.

## Capabilities

### New Capabilities

- `growth-views`: qué análisis ofrece el dashboard, qué hace con los datos que faltan, y qué no duplica del tablero operativo.

### Modified Capabilities

*(ninguna)*

## Impact

**Código.** `src/lib/rollups.ts`, `src/lib/formulas.ts` (nuevos) · cuatro páginas nuevas bajo `src/app/[account]/`.

**Datos.** Read-only. Suma una tercera raíz de lectura: el catálogo de fórmulas del vault personal, que **las dos marcas comparten**. Declarado acá porque cruza la frontera de marcas: el catálogo es doctrina compartida, no contenido, y no lleva cuerpo de piezas.

**Riesgo.** Para Tegu, la cadencia mensual va a estar casi vacía (~109 de 128 piezas sin fecha ISO) y la deuda va a arrancar con más de 100 filas. **Hay que diseñar las dos para que eso se lea como hallazgo y no como bug**: si una vista vacía parece un error de la app, nadie va a actuar sobre lo que está diciendo.

**Privacidad.** Toca las dos marcas. Depende de que `account-scoped-routes` esté cerrado.
