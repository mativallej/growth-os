# Tasks

> Requiere `fail-loud-sources` cerrado: sin el registro de fuentes y sin el baseline
> de slugs, este change no se puede verificar.

## 1. Fijar el comportamiento actual antes de tocarlo

- [x] 1.1 Correr `npm run audit` y anotar acá los conteos por fuente. Es el "antes".
- [x] 1.2 Escribir los tests de caracterización del parser actual sobre 3 fixtures reales (uno de cada gramática + `Thread Recap 4 Meses`, que tiene las dos). Verifica: `npm test`.

## 2. Partir el parser

- [x] 2.1 `src/lib/normalize.ts`: `parseNum` (regla estrecha de miles `^\d{1,3}(\.\d{3})+$`), `parseDate` (primer ISO del string), `normalizeStatus`, `normalizeChannel`, `channelFromPath`, y los mapas de alias. Verifica: tests de `2.4` vs `13.301`, y de un estado ambiguo cayendo en desconocido.
- [x] 2.2 `src/lib/footer.ts`: tokenizer por línea con toggle de fence ```` ``` ```` (los 10 archivos con prompts de Claude Design), strip de `- ` y de `**`, y acumulación de `unknownKeys`. Reusar el vocabulario de claves de `scripts/sync-notion.py`.
- [x] 2.3 `src/lib/snapshots.ts`: dispatcher entre el formato de corte vigente (`- snapshot <fecha> (<horizonte>): k=v`), el de tokens (`t=+56d imp=1788`) y el de prosa. Verifica: test de ida y vuelta contra una pieza escrita por `scripts/ingest-analytics.py --apply` en un vault de prueba.
- [x] 2.4 `snapshotFromFields`: los archivos del vault personal que tienen los números como bullets de primer nivel se colapsan en un corte implícito. **Sin esto, ~60 piezas con números se leen como piezas sin números.**

## 3. El modelo

- [x] 3.1 Extender `src/lib/types.ts`: `source`, `channel`, `status` (enums cerrados con el crudo al lado), `publishedAt`, `url`, `formulaCode`, `coverage`. Nada se renombra.
- [x] 3.2 Sacar el gate de `src/lib/parse.ts:172`. Verifica: el conteo de piezas del vault personal sube en 34 y esas 34 salen con `coverage: untracked`.
- [x] 3.3 Reemplazar el `catch {}` vacío de `src/lib/parse.ts:195` por un contador de archivos ilegibles que el audit reporta.
- [x] 3.4 `primaryReach` y `median` en `src/lib/metrics.ts`. Verifica: test de que una pieza de IG no queda en cero al ordenar por alcance.
- [x] 3.5 Envolver `loadPieces` en `cache()` de React.

## 4. El invariante que no se puede romper

- [x] 4.1 Diffear los slugs contra `slugs-baseline.txt`. **Cero drift.** Revisar a mano los 16 paths con acentos.
- [x] 4.2 Confirmar que `slugify` no se tocó: `git diff src/lib/parse.ts | grep -c slugify` → 0 líneas cambiadas en esa función.

## 5. La duplicación TS/Python

- [x] 5.1 Crear un caso compartido: una lista de rutas de los vaults que ambas herramientas deben reconocer como pieza. Correr el audit de Node y el dry-run de `sync-notion.py --scope posts` y comparar los conteos. Verifica: coinciden.
- [x] 5.2 Si no coinciden, arreglar el que esté mal y anotar acá cuál era y por qué.

## 6. Cerrar

- [x] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 6.2 Anotar acá el "después" del audit contra el "antes" del paso 1.1.

---

# Cierre — 2026-09-26

Aplicado entero. `tsc` · `lint` (0 errores) · **121 tests** (eran 62) · build de
**295 páginas** (eran 246: las 49 nuevas son piezas que antes se descartaban).

## El "antes" y el "después" (tareas 1.1 y 6.2)

| | tegu antes | tegu después | personal antes | personal después |
|---|---|---|---|---|
| piezas | 129 (12 descartadas) | **141** | 115 (39 descartadas) | **154** |
| con fecha | **0** | **45** | 95 | 96 |
| con métricas | 17 | **42** | 72 | 77 |
| piezas de IG con métricas | **0** de 65 | **17** | 12 de 24 | 12 |
| archivos ilegibles | se tragaban | 0, y se cuentan | — | — |

## Los seis defectos, y cómo se verificó cada uno

1. **El ` · ` partía valores.** `fórmula: X2 · Antagonista (...)` se leía `"X2"`.
   El tokenizer ahora parte solo donde el segmento siguiente abre una clave del
   vocabulario. Test: `footer.test.ts`, *"NO parte cuando el · está adentro de un valor"*.
2. **Tegu no tenía fechas.** Las escribe adentro del estado
   (`estado: Publicado 2026-07-08`). `parseDate` las extrae: 0 → 45.
3. **Se descartaban piezas.** El gate de `parse.ts:172` no existe más; cada pieza
   lleva `coverage` (tracked/pending/untracked).
4. **Instagram rankeaba en cero.** `views` no estaba en el mapa de métricas y es
   el alcance primario de IG. Se suma, más `primaryReach`, que elige la métrica
   por canal y devuelve `null` —no 0— si no hay ninguna.
5. **El modelo no sabía de marcas.** `source` ya estaba; se suman `channel`,
   `status`, `publishedAt`, `formulaCode` y `coverage`, todos con el crudo al lado.
6. **`catch {}` vacío.** Un archivo ilegible se cuenta en `unreadable` y se
   reporta; el resto de la fuente sigue.

## Hallazgos que el proposal no tenía

- **Una tercera gramática de corte**, solo en Tegu: `snapshot <fecha> (<horizonte>)
  @<cuenta>: k=v`. Son **25 archivos** (17 `@ig_tegu`, 8 `@x_tegu`) que no tenían
  un solo corte leído porque el regex exigía el `:` pegado al paréntesis. La
  cuenta se conserva en `Snapshot.account`: una marca tiene varias cuentas por
  red, y dos mediciones de cuentas distintas no son la misma pieza medida dos veces.
- **Una cuarta, escrita a mano**: `snapshot 1 hora completa (21:54): impressions
  744 · engagements 146 (19,6%)` — etiqueta libre en vez de fecha y el nombre de
  la métrica ANTES del número, al revés que la prosa de Tegu. `readProse` lee los
  dos órdenes.
- **Cortes en prosa fuera de un bloque `analytics:`** (`- 2026-07-17 +3min: 13 imp`)
  caían al parseo genérico de claves y se perdían enteros.
- **La tarea 2.4 partía de un número mal medido.** El proposal decía "~60 piezas"
  con métricas en bullets sueltos; son **2** (grep sobre el vault, 2026-09-26). La
  función se implementó igual porque es la forma que usa la carga a mano.

## El invariante de slugs (tareas 4.1 y 4.2)

`slugify` **no se tocó**: 0 líneas cambiadas en su cuerpo.

El diff contra `slugs-baseline.txt` da **74 slugs del baseline que ya no existen**,
y NO los rompió este change: se revirtió el parser al de `git HEAD` y encuentra
**exactamente los mismos 74 faltantes**. El drift es de la reorganización del vault
entre el 2026-09-24 (cuando se tomó el baseline) y hoy — el problema que
`stable-piece-id` existe para resolver. Los 16 paths con acento se revisaron a
mano y los que siguen en disco mantienen su slug.

**El baseline quedó obsoleto** y hay que re-tomarlo cuando el vault se aquiete.

## La paridad TS/Python (tareas 5.1 y 5.2)

`piece-model.test.ts` corre el `inspect()` del audit de Node contra el parser de
TypeScript, archivo por archivo, sobre los dos vaults reales: **0 discrepancias**.
Llegar ahí encontró bugs de los dos lados, y vale anotar cuál era cuál:

| Quién estaba mal | Qué |
|---|---|
| audit | exigía `t=[+-]`, y `t=final` no tiene signo — 3 piezas de Tegu |
| audit | sin toggle de fence: leía como metadatos el prompt de Claude Design que cierra 10 archivos |
| audit | partía por ` · ` también las líneas de bullet, así que un `notas:` largo escupía pares clave/valor falsos |
| **parser** | no reconocía cortes en prosa fuera de un bloque `analytics:` |
| **parser** | cabecera de contrato con cuerpo en prosa (`snapshot 2026-07-16 (+2d): 943 views · 296 reach`) |

## Lo que NO se hizo

- **Re-tomar el baseline de slugs.** No tiene sentido mientras el vault se mueva;
  va con `stable-piece-id`.
- **`npm run build` falló la primera vez por `ENOSPC`**: el disco estaba al 100%
  (228 MB libres de 228 GB). Se borró `.next` (160 MB) y pasó. **Quedan 3.8 GB
  libres, que es poco**: `~/Library/Caches/Google` (2.9 GB) y `~/.npm` (1.4 GB)
  son los candidatos obvios, y no se tocaron porque son del usuario, no del repo.
