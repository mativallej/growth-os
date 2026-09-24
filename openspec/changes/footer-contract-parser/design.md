# Design

## Un parser tolerante, no un adapter por fuente

Lo obvio sería un adapter por vault: uno que lea la gramática de Brain, otro la de
Tegu. Se descarta, y el motivo es empírico: **las dos gramáticas ya se cruzan**. En
el vault personal hay 16 archivos con el footer inline de Tegu, y en Tegu hay un
archivo (`Thread Recap 4 Meses`) con los dos formatos de corte en el mismo bloque.
Un adapter por fuente no podría leer ninguno de esos.

La diferencia real entre las dos gramáticas es una sola línea de código: si se parte
por ` · ` o no. El origen sobrevive solo como desempate, porque en los bullets del
vault personal el ` · ` es contenido legítimo (`views: 30.448 (followers 10% ·
non-followers 90%)`).

## `coverage` en vez de descartar

Hoy una pieza sin footer no existe. La alternativa no es incluirla en todo, sino
marcarla:

| coverage | Qué significa | Dónde aparece |
|---|---|---|
| `tracked` | tiene al menos un corte medido | en todo |
| `pending` | tiene footer, dice pendiente | inventario, deuda |
| `untracked` | no tiene footer | inventario, deuda |

El criterio: **aparecen donde su ausencia sería una mentira, no donde su presencia
sesgaría una tasa.** Los 34 sin metadata entran en inventario y en deuda; no entran
en los KPIs, la cadencia ni el uso de fórmulas.

## Los números de miles

El vault trae `13.301` junto a `374094`. La regla de limpieza es estrecha a
propósito: se quitan los puntos **solo** si el string matchea
`^\d{1,3}(\.\d{3})+$`. Así `2.4` sigue siendo 2,4 y no 24.

## Dueño de campo

Este change no introduce ninguna fuente nueva. Sigue mandando el `.md` en todo lo
que el parser lee; Notion no participa acá. El único campo con dos dueños del
sistema —el estado del kanban— **no se lee desde el dashboard**: el dashboard
muestra el `status` del vault, que es el que el vault conoce.

## Qué pasa si la fuente falta

Cubierto por `content-sources`: `assertRoots()` ya rompió el build antes de que el
parser corra. Acá el caso que queda es el archivo ilegible individual, que SHALL
contarse y reportarse, nunca tragarse con un `catch {}` vacío como hoy
(`src/lib/parse.ts:195`).
