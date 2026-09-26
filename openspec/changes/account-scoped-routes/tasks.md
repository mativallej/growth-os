# Tasks

> Requiere `footer-contract-parser` cerrado: sin `source` en el modelo no hay por
> dónde separar.

## 1. Leer antes de escribir

- [x] 1.1 Leer la documentación local de Next 16 (`node_modules/next/dist/docs/`) para `generateStaticParams` anidado y `redirects`. Next 16 tiene breaking changes respecto del entrenamiento; no asumir la API.

## 2. Las rutas

- [x] 2.1 Mover las cuatro páginas a `src/app/[account]/`. Verifica: `npm run build` emite las rutas con marca.
- [x] 2.2 **Borrar** las rutas viejas para que no hagan shadow.
- [x] 2.3 `generateStaticParams` por cuenta, alimentado por `listSources()`.
- [x] 2.4 Redirects en `next.config.ts` de las cuatro rutas viejas. Verifica: `curl -sI localhost:3000/piezas/<slug>` → 307 al equivalente con marca.

## 3. Los componentes

- [x] 3.1 `AccountSwitcher` (client): dos pills que preservan la subruta; **no renderiza si `listSources()` devuelve una sola**. Verifica: build restringido a una marca y confirmar que el selector no aparece.
- [x] 3.2 `DashboardNav` recibe `account` y `sources` por props. Sacar los textos hardcodeados de Tegu.
- [x] 3.3 Extraer `BarList` del markup duplicado. Verifica: `grep -c` del markup de barras en `src/components/` baja a 1.
- [x] 3.4 Sacar el violeta heredado de `src/lib/charts.ts`.
- [x] 3.5 Empty state de `PiezasClient` sin la mención a la skill de Tegu.

## 4. La verificación de privacidad

- [x] 4.1 Escribir el chequeo de aislamiento como test: para cada vista de una marca, assert de que ningún `body` de la otra aparece en el HTML ni en el payload. Elegir como sonda un término que solo exista en el contenido personal.
- [x] 4.2 Correrlo contra las cuatro vistas de las dos marcas. **Vale más que todos los demás checks de este change.**
- [x] 4.3 `GROWTH_SOURCES=tegu npm run build` y confirmar que no se emitió ninguna ruta de la marca personal, ni en el manifiesto ni en el output.

## 5. Cerrar

- [x] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 5.2 Diffear slugs contra el baseline otra vez: el segmento de cuenta se antepone, el identificador de la pieza no cambia.

---

# Cierre — 2026-09-26

**Aplicado entero. El aislamiento entre marcas deja de ser una intención y pasa a
ser una propiedad del build, verificada.**

`tsc` · `lint` (0 errores) · **140 tests** · build de 303 páginas (295 piezas + las
vistas de las dos marcas).

## Lo que cambió

| | |
|---|---|
| rutas | `/[account]/...` — las cuatro viejas **borradas**, no deprecadas |
| `next.config.ts` | redirects 307 de las cuatro viejas a la cuenta por defecto |
| `[account]/layout.tsx` | valida la cuenta contra las fuentes DEL BUILD, o 404 |
| `AccountSwitcher` | preserva la subruta; **no se renderiza con una sola fuente** |
| `DashboardNav` | recibe `account` y `accounts` por props, sin textos de una marca |
| `BarList` | extraído del markup duplicado — de 2 copias a 1 |
| `src/lib/charts.ts` | fuera el violeta heredado; ink + greys del tema |
| `PiezasClient` | el empty state ya no nombra la skill de una marca |

## La verificación que vale (tareas 4.1–4.3)

**Sonda elegida:** `me desvincularon` y `mi viejo` — verificadas con grep el
2026-09-26: 2 y 3 archivos en el vault personal, **0 en el de Tegu**.

| qué | resultado |
|---|---|
| `loadPieces([tegu])` contiene alguna sonda | **no** |
| las sondas SÍ están en el vault personal (si no, el test no prueba nada) | **sí** — el control está en el test |
| páginas `/tegu/*` del build completo con sondas | **0** de 141 |
| páginas `/personal/*` con sondas (control) | 20 |
| `GROWTH_SOURCES=tegu`: rutas `/personal` emitidas | **0** |
| `GROWTH_SOURCES=tegu`: `/personal` en el manifiesto | **0** |
| `GROWTH_SOURCES=tegu`: sondas en TODO `.next` | **0** |

## El agujero que apareció al verificar, y que era real

El build recortado no emitía las rutas de la marca personal — y **`/personal/piezas`
devolvía 200 igual**, sirviendo el vault personal leído en el momento, sondas
incluidas. Verificado contra `next start`, no deducido.

La causa: Next renderiza bajo demanda cualquier param que `generateStaticParams`
no haya devuelto. El build era correcto; el servidor fabricaba la página que al
build le faltaba.

**Arreglado con `export const dynamicParams = false`** en los dos segmentos
dinámicos. Después del arreglo: `/personal`, `/personal/piezas` y
`/personal/inventario` devuelven **404**, y 0 sondas servidas.

Quedó un test de regresión (`account-isolation.test.ts`) que verifica que la línea
siga declarada. Es un test de forma y no de comportamiento, porque el
comportamiento solo se ve con un build servido — pero lo que puede desaparecer sin
que nadie lo note es la línea.

## El segundo hallazgo: el registro se inlineaba

`src/lib/sources.ts` hacía `import rawConfig from '../../config/sources.json'`, y
un import estático mete el archivo ENTERO en el bundle. Un build recortado a Tegu
se llevaba adentro la ruta del vault personal y su etiqueta.

No era contenido, pero sí información de la otra marca dentro de un artefacto que
se comparte — que es lo que el README nombraba como pendiente de este change.
**Ahora la config se lee con `fs` en runtime**, y el JSON no entra al bundle:

| | antes | después |
|---|---|---|
| `Personal Brand` en el build de tegu | 2 archivos | **0** |
| `vaults/brain` | 6 | 4 — **todas contenido de Tegu** |
| `Marca personal` | 10 | 8 — **todas contenido de Tegu** |

Los que quedan se revisaron uno por uno: son piezas de Tegu que mencionan esas
palabras en su propio texto (un doc de evaluación que cita `~/vaults/brain`, una
tabla de pilares de contenido que tiene una fila "Marca personal"). Contenido de
Tegu en el build de Tegu.

## Redirects (tarea 2.4), verificados contra `next start`

```
/          → 307 /tegu
/piezas    → 307 /tegu/piezas
/inventario→ 307 /tegu/inventario
/piezas/<slug> → 307 /tegu/piezas/<slug>
```

`permanent: false` (307) y no 308 a propósito: la cuenta por defecto depende de
cómo se buildeó, y un 308 la cachearía para siempre en el navegador de alguien.

## Slugs (tarea 5.2)

**El identificador de la pieza no cambió**: solo se le antepuso el segmento de
marca. `blog-b1-...-cuatro-meses-de-tegu` ahora vive en
`/tegu/piezas/blog-b1-...-cuatro-meses-de-tegu`. `slugify` no se tocó y los paths
con acento siguen con su guión.

## Lo que este change HABILITA

Hasta hoy el README decía *"ningún build de este repo debe compartirse con nadie"*.
Con esto verificado, **un build hecho con `GROWTH_SOURCES=tegu` se puede
compartir**: no contiene contenido personal, no emite sus rutas, no las sirve bajo
demanda y no lleva la config de la otra marca.

Lo que sigue abierto es D-12 (si el deploy se comparte y cómo), que es una
decisión, no una condición técnica.
