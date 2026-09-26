# Proposal

## Why

Hoy las rutas son `/`, `/piezas`, `/piezas/[slug]` e `/inventario`, sin ninguna
noción de marca. Cuando entren las dos fuentes, la forma barata de separarlas sería
un filtro en el cliente: cargar todo y mostrar lo que corresponda.

**Eso filtra contenido personal dentro de la vista de Tegu.** Con filtrado en
cliente, el payload RSC de `/piezas` contendría el `body` de las dos cuentas: la
ese material viajaría, en texto plano, dentro de una página que se le
comparte al socio. No es un problema de estilo; es el requisito que define este
proyecto.

Hay dos razones más:

- **Compone con el recorte de fuentes.** Con segmento de ruta, un build restringido a Tegu directamente **no emite** rutas de la marca personal. El deploy del socio no contiene el contenido, no lo esconde.
- **Deja las agregaciones en el servidor.** Los KPI se calculan por cuenta sin mandar el conjunto entero al navegador.

## What Changes

- Las rutas pasan a `/[account]/...`. Se borran las viejas para que no hagan shadow.
- `next.config.ts` gana redirects de las rutas viejas a la cuenta por defecto, para no romper links ya compartidos.
- Un selector de cuenta que preserva la subruta y **no se renderiza si hay una sola fuente en el build**.
- `DashboardNav` recibe la cuenta y las fuentes por props; pierde los textos hardcodeados de Tegu.
- Se extrae `BarList` (el markup de barras ya está duplicado dos veces y lo necesitan las cuatro vistas del change siguiente).
- Se despinta el violeta que quedó del tema anterior en `src/lib/charts.ts`.

**La línea divisoria:** cuenta = ruta, facetas = cliente. Los chips de canal y el buscador siguen en el navegador.

**No incluye:** las vistas nuevas, ni el deploy.

## Capabilities

### New Capabilities

- `account-isolation`: cómo se separan las dos marcas, qué garantía de aislamiento se ofrece, y qué se verifica antes de compartir un build.

### Modified Capabilities

- `content-sources`: el recorte de fuentes pasa de ser una preferencia a ser la frontera de privacidad del build.

## Impact

**Código.** `src/app/[account]/*` (nuevo) · rutas viejas eliminadas · `next.config.ts` (redirects) · `src/components/DashboardNav.tsx`, `src/components/PiezasClient.tsx` (props en vez de hardcode) · `src/components/BarList.tsx` (extraído) · `src/lib/charts.ts`.

**Privacidad.** Es el change que la establece. Hasta que cierre, **ningún build de este repo debe compartirse con nadie.**

**Invariante.** Los identificadores de las piezas de Tegu no cambian; solo se les antepone el segmento de cuenta. Los links viejos siguen resolviendo por redirect.

**Riesgo.** Next 16 tiene cambios respecto del entrenamiento del modelo: leer la documentación local de `generateStaticParams` anidado y de `redirects` antes de escribir las rutas, no asumir.
