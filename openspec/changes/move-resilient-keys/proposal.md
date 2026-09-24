# Proposal

## Why

El 2026-09-24, mientras se trabajaba en el repo, **el vault de Tegu se reestructuró**:
`Brand/` desapareció y su contenido pasó a `Create/Organic/`. El movimiento está
commiteado (`ba96059`) y es correcto — pone la separación ads/orgánico en el
filesystem.

El efecto en el puente fue inmediato y silencioso:

- **49 filas** del tablero de contenido apuntan a rutas que ya no existen.
- **8 más** bajo `Create/` cambiaron de lugar dentro de la reorganización.
- Las **57 filas de la marca personal** quedaron intactas, porque ese vault no se tocó.

La llave de emparejamiento es la ruta relativa del archivo. Se eligió porque
sobrevive a renombrar el título, que es lo más frecuente. Pero **no sobrevive a
mover**, y esta mañana quedó anotado como deuda conocida:

> *"Decidir qué hacer cuando una pieza se mueve de carpeta: hoy la llave es la ruta
> relativa, así que se ve como fila nueva. Aceptado por ahora, porque mover es mucho
> menos frecuente que renombrar."*

Pasó ocho horas después, a escala, y muestra que el diagnóstico estaba mal: mover no
es infrecuente. Una reorganización mueve cientos de archivos de una vez.

**Lo grave no es que la llave se rompa.** Es que el sync no puede distinguir una
mudanza de una creación masiva: al no encontrar las rutas viejas y sí 93 archivos
"nuevos", **crearía 93 filas duplicadas** y dejaría 57 huérfanas al lado. El tablero
que se cargó ayer quedaría inutilizable, y deshacerlo es trabajo manual sobre 150
filas.

## What Changes

- **Un freno**: cuando una proporción alta de las entradas existentes queda huérfana en la misma ejecución, el sync **se detiene** en vez de crear. Una mudanza se parece demasiado a una creación masiva como para resolverla por default.
- **Reconciliación**: una entrada huérfana y un archivo sin entrada que son evidentemente la misma pieza se vuelven a emparejar, actualizando la llave. Lo evidente se aplica; lo ambiguo se lista para que lo resuelva una persona.
- **La llave sigue siendo la ruta**, pero deja de ser la única señal de identidad: el emparejamiento puede apoyarse en lo que la pieza declara y en su contenido.
- Las 57 filas afectadas se re-mapean como parte de este change, no a mano.

**No incluye:** escribir un identificador dentro de cada `.md`. Se evaluó y se
descarta por ahora: tocar 200 archivos del vault para resolver un problema de este
lado contradice la regla de que el dashboard se adapta al vault y no al revés. Si la
reconciliación resulta insuficiente, se reconsidera.

## Capabilities

### New Capabilities

- `piece-identity`: cómo se reconoce que dos registros hablan de la misma pieza a lo largo del tiempo, qué pasa cuando la evidencia es ambigua, y qué hace el sistema ante un movimiento masivo.

### Modified Capabilities

- `notion-bridge`: el emparejamiento deja de depender exclusivamente de la ruta.

## Impact

**Código.** `scripts/sync-notion.py` (freno y reconciliación) · `scripts/sync-notion-docs.py` (mismo problema: su estado en `.state/` también está indexado por ruta).

**Datos.** El re-mapeo modifica la llave de 57 filas. No toca contenido ni estado. **Ninguna fila se borra.**

**Urgencia.** Hasta que este change cierre, **no se debe correr el sync de Tegu con `--apply`.** El dry-run es seguro y muestra el problema.

**Riesgo.** Una reconciliación equivocada empareja dos piezas distintas y pisa la llave de una fila viva. Por eso lo ambiguo no se aplica: se lista.

**Lo que no cubre.** Si una pieza se mueve *y* se renombra *y* se reescribe en la misma tanda, no hay señal suficiente y va a aparecer como huérfana más una nueva. Es correcto: en ese caso no hay evidencia de que sean la misma.
