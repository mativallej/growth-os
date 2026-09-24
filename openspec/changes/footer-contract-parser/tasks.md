# Tasks

> Requiere `fail-loud-sources` cerrado: sin el registro de fuentes y sin el baseline
> de slugs, este change no se puede verificar.

## 1. Fijar el comportamiento actual antes de tocarlo

- [ ] 1.1 Correr `npm run audit` y anotar acá los conteos por fuente. Es el "antes".
- [ ] 1.2 Escribir los tests de caracterización del parser actual sobre 3 fixtures reales (uno de cada gramática + `Thread Recap 4 Meses`, que tiene las dos). Verifica: `npm test`.

## 2. Partir el parser

- [ ] 2.1 `src/lib/normalize.ts`: `parseNum` (regla estrecha de miles `^\d{1,3}(\.\d{3})+$`), `parseDate` (primer ISO del string), `normalizeStatus`, `normalizeChannel`, `channelFromPath`, y los mapas de alias. Verifica: tests de `2.4` vs `13.301`, y de un estado ambiguo cayendo en desconocido.
- [ ] 2.2 `src/lib/footer.ts`: tokenizer por línea con toggle de fence ```` ``` ```` (los 10 archivos con prompts de Claude Design), strip de `- ` y de `**`, y acumulación de `unknownKeys`. Reusar el vocabulario de claves de `scripts/sync-notion.py`.
- [ ] 2.3 `src/lib/snapshots.ts`: dispatcher entre el formato de corte vigente (`- snapshot <fecha> (<horizonte>): k=v`), el de tokens (`t=+56d imp=1788`) y el de prosa. Verifica: test de ida y vuelta contra una pieza escrita por `scripts/ingest-analytics.py --apply` en un vault de prueba.
- [ ] 2.4 `snapshotFromFields`: los archivos del vault personal que tienen los números como bullets de primer nivel se colapsan en un corte implícito. **Sin esto, ~60 piezas con números se leen como piezas sin números.**

## 3. El modelo

- [ ] 3.1 Extender `src/lib/types.ts`: `source`, `channel`, `status` (enums cerrados con el crudo al lado), `publishedAt`, `url`, `formulaCode`, `coverage`. Nada se renombra.
- [ ] 3.2 Sacar el gate de `src/lib/parse.ts:172`. Verifica: el conteo de piezas del vault personal sube en 34 y esas 34 salen con `coverage: untracked`.
- [ ] 3.3 Reemplazar el `catch {}` vacío de `src/lib/parse.ts:195` por un contador de archivos ilegibles que el audit reporta.
- [ ] 3.4 `primaryReach` y `median` en `src/lib/metrics.ts`. Verifica: test de que una pieza de IG no queda en cero al ordenar por alcance.
- [ ] 3.5 Envolver `loadPieces` en `cache()` de React.

## 4. El invariante que no se puede romper

- [ ] 4.1 Diffear los slugs contra `slugs-baseline.txt`. **Cero drift.** Revisar a mano los 16 paths con acentos.
- [ ] 4.2 Confirmar que `slugify` no se tocó: `git diff src/lib/parse.ts | grep -c slugify` → 0 líneas cambiadas en esa función.

## 5. La duplicación TS/Python

- [ ] 5.1 Crear un caso compartido: una lista de rutas de los vaults que ambas herramientas deben reconocer como pieza. Correr el audit de Node y el dry-run de `sync-notion.py --scope posts` y comparar los conteos. Verifica: coinciden.
- [ ] 5.2 Si no coinciden, arreglar el que esté mal y anotar acá cuál era y por qué.

## 6. Cerrar

- [ ] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 6.2 Anotar acá el "después" del audit contra el "antes" del paso 1.1.
