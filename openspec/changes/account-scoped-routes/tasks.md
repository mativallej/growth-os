# Tasks

> Requiere `footer-contract-parser` cerrado: sin `source` en el modelo no hay por
> dónde separar.

## 1. Leer antes de escribir

- [ ] 1.1 Leer la documentación local de Next 16 (`node_modules/next/dist/docs/`) para `generateStaticParams` anidado y `redirects`. Next 16 tiene breaking changes respecto del entrenamiento; no asumir la API.

## 2. Las rutas

- [ ] 2.1 Mover las cuatro páginas a `src/app/[account]/`. Verifica: `npm run build` emite las rutas con marca.
- [ ] 2.2 **Borrar** las rutas viejas para que no hagan shadow.
- [ ] 2.3 `generateStaticParams` por cuenta, alimentado por `listSources()`.
- [ ] 2.4 Redirects en `next.config.ts` de las cuatro rutas viejas. Verifica: `curl -sI localhost:3000/piezas/<slug>` → 307 al equivalente con marca.

## 3. Los componentes

- [ ] 3.1 `AccountSwitcher` (client): dos pills que preservan la subruta; **no renderiza si `listSources()` devuelve una sola**. Verifica: build restringido a una marca y confirmar que el selector no aparece.
- [ ] 3.2 `DashboardNav` recibe `account` y `sources` por props. Sacar los textos hardcodeados de Tegu.
- [ ] 3.3 Extraer `BarList` del markup duplicado. Verifica: `grep -c` del markup de barras en `src/components/` baja a 1.
- [ ] 3.4 Sacar el violeta heredado de `src/lib/charts.ts`.
- [ ] 3.5 Empty state de `PiezasClient` sin la mención a la skill de Tegu.

## 4. La verificación de privacidad

- [ ] 4.1 Escribir el chequeo de aislamiento como test: para cada vista de una marca, assert de que ningún `body` de la otra aparece en el HTML ni en el payload. Elegir como sonda un término que solo exista en el contenido personal.
- [ ] 4.2 Correrlo contra las cuatro vistas de las dos marcas. **Vale más que todos los demás checks de este change.**
- [ ] 4.3 `GROWTH_SOURCES=tegu npm run build` y confirmar que no se emitió ninguna ruta de la marca personal, ni en el manifiesto ni en el output.

## 5. Cerrar

- [ ] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 5.2 Diffear slugs contra el baseline otra vez: el segmento de cuenta se antepone, el identificador de la pieza no cambia.
