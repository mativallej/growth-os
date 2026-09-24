# Proposal

## Why

`docs/footer-contract.md` dice, textual: *"el parser de esta app lee este formato"*.
**No lo lee.** El contrato vigente pone las métricas en líneas de corte al final del
archivo:

```
- snapshot 2026-09-23 (+1d): views=1592 reach=858 likes=47 shares=14
```

`src/lib/parse.ts` solo reconoce cortes **dentro de un bloque `analytics:`** y solo
si traen un token `t=` (`parseSnapshot`, `src/lib/parse.ts:57` devuelve `null` sin
`t`). Una línea de corte del contrato nuevo cae al parseo genérico de `key: value`,
cuyo regex de clave admite letras, puntos, espacios y guiones — pero no dígitos ni
paréntesis, así que `- snapshot 2026-09-23 (+1d)` no matchea y **la línea se
descarta sin dejar rastro**. El ingest escribe un formato que el dashboard no ve.

Cuatro defectos más del mismo archivo, todos silenciosos:

1. **Se descartan piezas por no tener footer.** `src/lib/parse.ts:172`:
   `if (!meta.canal && !meta.formula && !meta.formato) return null;`. En el vault
   personal hay 34 archivos sin metadata, de los cuales **21 son el corpus
   histórico de LinkedIn**. Ignorarlos hace ver ese canal casi vacío y esconde el
   agujero real, que es justamente lo que el dashboard tendría que mostrar.

2. **Entiende una sola gramática de footer.** Solo el bloque final tras el último
   `---`. El vault personal escribe un bullet por clave; Tegu escribe varias claves
   en una línea separadas por ` · `. El mismo error ya se cometió en Python y se
   arregló el 2026-09-24: el lector veía **14 piezas de Tegu donde hay 95**
   (`scripts/sync-notion.py`, constante `CLAVES` y el docstring que lo explica).

3. **No tiene noción de marca.** `grep -c "brand\|source\|marca" src/lib/types.ts`
   → **0**. El modelo no puede distinguir una pieza personal de una de Tegu, que es
   el requisito de privacidad de todo el proyecto.

4. **Instagram rankea en cero.** El orden usa `impressions`, y ninguna pieza de IG
   tiene ese campo: usa `views`. Hace falta un alcance primario derivado.

## What Changes

- **`src/lib/parse.ts` se parte en cuatro**: `normalize.ts` (coerción pura),
  `footer.ts` (tokenizer por línea), `snapshots.ts` (dispatcher de formatos de
  corte) y `parse.ts` (orquestación).
- El tokenizer entiende **las dos gramáticas** y reusa la lista de claves conocidas
  ya validada en `scripts/sync-notion.py`. La lista de claves es el filtro: sin
  ella, una línea de prosa como `Detrás de todo esto: +150 builds` entraría como
  metadato.
- **El formato de corte vigente pasa a ser el que manda**, y el bloque `analytics:`
  con tokens `t=` se sigue leyendo como formato histórico.
- **El parser deja de devolver `null` por falta de footer.** Cada pieza lleva una
  `coverage` explícita: medida, pendiente o sin trackear. Solo se descarta por
  ignore.
- El modelo suma `source` (marca), `channel` y `status` normalizados, con el valor
  crudo al lado, más `publishedAt`, `url` y `formulaCode`.
- **`primaryReach`**: alcance primario derivado, para que IG y X se puedan ordenar
  en la misma lista sin mentir.
- `loadPieces` envuelta en `cache()` de React — hoy corre una vez por página, sin
  memoizar.

**No incluye:** rutas, vistas nuevas, ni tocar `slugify`. Y **no reescribe ningún
`.md`**: el dashboard se adapta al vault.

## Capabilities

### New Capabilities

- `piece-model`: qué es una pieza, qué metadatos tiene, cómo se leen de las dos gramáticas de footer, y cómo se representa una pieza de la que no sabemos nada.

### Modified Capabilities

- `content-sources`: el parser pasa a recibir las fuentes del registro en vez de resolver una sola.

## Impact

**Código.** `src/lib/normalize.ts`, `src/lib/footer.ts`, `src/lib/snapshots.ts` (nuevos) · `src/lib/parse.ts`, `src/lib/types.ts`, `src/lib/metrics.ts` (modificados).

**Datos.** Ninguno. Read-only sobre los vaults.

**Duplicación conocida y aceptada.** La gramática de footer queda implementada dos veces: en TypeScript acá y en Python en `scripts/sync-notion.py`. Es a propósito —el script tiene que correr sin `node_modules`— pero **las dos SHALL coincidir en qué cuenta como pieza**, y el requirement correspondiente lo fija con un caso compartido.

**Riesgo principal.** `normalizeStatus` clasificando de más: hay 25 formas de `estado:` en Tegu y 11 de `status:` en el vault personal, varias con prosa larga. Si ante la duda marca "publicado", la vista de deuda se llena de falsos positivos justo en su función principal. Default `unknown`, y el audit lista los que cayeron ahí.

**Invariante duro.** Los slugs de Tegu tienen que salir **idénticos** al baseline guardado en `fail-loud-sources`. Revisar a mano los 16 con acentos.

**Privacidad.** Toca las dos marcas. El aislamiento sigue sin estar garantizado hasta `account-scoped-routes`.
