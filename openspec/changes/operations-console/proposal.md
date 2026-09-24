# Proposal

## Why

Hoy las operaciones del sistema están desparramadas en cuatro lugares y no hay
ninguno donde se vea qué se puede hacer:

- **Scripts** en `scripts/`: ingesta de analytics, sync de contenido, sync de documentación, avisos.
- **Skills** en tres repos distintos: `brain-*` en el vault personal, `growth-*` en tegu-growth, `tegu-*` en tegu-docs.
- **Trabajos agendados** que se apagan en `unschedule-everything`.
- **El MCP**, cuando hay una sesión de agente abierta.

Para correr cualquier cosa hay que acordarse de que existe, saber en qué repo vive,
y recordar sus flags. **El conocimiento operativo está en la cabeza de una sola
persona**, justo cuando se sumó alguien más al equipo.

Y la app hoy solo lee. Es un tablero de consulta cuando lo que hace falta es la
pantalla desde la que se opera.

**La decisión de `unschedule-everything` hace que esto sea necesario, no opcional.**
Si nada corre solo, el lugar desde donde se dispara todo tiene que existir y tiene
que ser obvio.

## What Changes

- **Un catálogo declarativo de operaciones.** Cada una declara qué hace, qué parámetros toma, qué precondiciones necesita y cómo se ejecuta. Agregar una operación es agregar una entrada, no tocar la interfaz.
- **Parámetros comunes**: rango de fechas, marca, **ads / orgánico / ambos**, canal, estado. Los filtros que el catálogo declara son los que la interfaz ofrece.
- **Tres formas de ejecución**, declaradas por cada operación:
  - **Captura**: la persona escribe el contenido y la app lo guarda. Es el caso del input de ideas: no hay nada que revisar, porque quien lo escribió está ahí.
  - **Export**: la app produce un archivo y el navegador lo descarga. Solo lectura.
  - **Entrega a sesión local**: la app arma el contexto y abre una sesión de agente en la máquina, con la operación explicada. **La app no aplica el cambio**; lo hace la sesión, con una persona mirando.

  La línea no es leer contra escribir: es **autoría contra derivación**. Una idea que alguien acaba de tipear se guarda y listo. Un cambio que el sistema *dedujo* de los datos —qué filas crear, qué estados devolver al vault, qué documentos pisar— pasa por revisión.

- **Las operaciones son granulares, no solo por lote.** Sincronizar *este* post, desde la fila de ese post. Hoy los scripts son todo-o-nada por alcance, y eso obliga a correr un lote de 95 para empujar uno.

- **El catálogo cubre todo.** Ninguna operación del sistema queda sin botón: si existe como script o como skill operativa y no está en el catálogo, falta.
- **Cada operación muestra hace cuánto se ejecutó** por última vez con éxito.
- **La consola solo existe en el build local.** Un build compartido no la incluye.

**La frontera, que es lo que define el alcance de esta pantalla:** *la operación
creativa es Obsidian; la operación de growth es la plataforma.* Acá se capta una
idea, se sube un lote de creativos, se sincroniza un post, se exporta, se ingesta.
**Acá no se escribe ni se edita una pieza.** Una idea es materia prima de intake, no
trabajo creativo; en el momento en que se convierte en pieza, se va a Obsidian.

**No incluye:** las operaciones de ads con métricas (no hay contrato todavía, ver `ads-model`), ni la pestaña del mapa del sistema (`system-map-page`).

## Capabilities

### New Capabilities

- `operations`: qué operaciones ofrece el sistema, cómo se parametrizan, cómo se ejecutan, y qué garantías hay sobre lo que la app puede y no puede hacer por su cuenta.

### Modified Capabilities

- `account-isolation`: la frontera entre build local y build compartido pasa a separar también capacidades, no solo contenido.

## Impact

**Código.** `src/lib/operations.ts` (catálogo, nuevo) · `src/app/[account]/operar/` (nuevo) · manejadores de ruta para exports y para la entrega a sesión (nuevos, solo locales).

**Seguridad — el punto crítico de este change.** Un manejador que lanza procesos en la máquina es, por definición, ejecución remota de código si queda accesible. Por eso:

1. Esos manejadores **no se compilan** en un build no local, no alcanza con esconder el botón.
2. La app **nunca ejecuta operaciones que escriben**: las delega a una sesión donde una persona aprueba.
3. Ninguna operación se dispara navegando: los efectos van solo en peticiones que no son de navegación.
4. Los parámetros se validan contra el catálogo antes de armar cualquier comando; nada de lo que viene de la interfaz se interpola crudo.

**Privacidad.** Depende de `account-scoped-routes`. Un export hereda el aislamiento de la ruta desde la que se pidió: un export pedido desde una marca no puede contener piezas de la otra.

**Lo que no resuelve.** Si nadie abre la consola, no pasa nada. Es el costo aceptado en `unschedule-everything`, y la mitigación es que las antigüedades estén a la vista.
