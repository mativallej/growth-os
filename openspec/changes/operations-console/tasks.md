# Tasks

> **Se puede hacer en dos etapas, y la primera se puede empezar ya.** Verificado el
> 2026-09-24: los scripts de `scripts/` funcionan solos, sin la app —leen el vault por
> su cuenta, en Python— y la app ya buildea contra las fuentes reales desde que cerró
> `fail-loud-sources`.
>
> **Etapa 1 — los botones (bloques 1, 3, 4, 6, 7).** No depende de los changes 2 a 4.
> El catálogo, los disparadores, la captura de ideas y la antigüedad no tocan datos de
> piezas, así que no tienen exposición de privacidad ni necesitan el parser. Lo único
> que necesita de otro change es la marca de última corrida
> (`unschedule-everything`, tarea 4.1), que es una línea.
>
> **Etapa 2 — las exportaciones (bloque 2).** Sí requiere `footer-contract-parser` (un
> export de piezas necesita leerlas bien) y `account-scoped-routes` (**un export no
> puede contener filas de la otra marca**, y esa garantía es estructural, no un
> filtro). No adelantar este bloque.
>
> Mientras la etapa 2 no esté, la consola vive en su propia ruta y **no muestra ni
> exporta contenido de piezas**. Cuando entre el routing por marca, se mueve bajo él.

## 1. El catálogo

- [x] 1.1 `src/lib/operations.ts`: tipo de operación (id, nombre, descripción, parámetros, precondiciones, forma de ejecución, período esperado) y la declaración de las que ya existen: ingesta de analytics, sync de contenido, sync de documentación, digest, exportaciones.
- [x] 1.2 Tipar los parámetros comunes: rango de fechas, marca, **ads/orgánico/ambos**, canal, estado. Verifica: test de que un valor fuera de lo declarado se rechaza.
- [x] 1.3 Evaluador de precondiciones. Verifica: test con un insumo ausente → la operación no se puede disparar y dice qué falta.

## 2. Las exportaciones

- [x] 2.1 Manejador de exportación que aplica los filtros del catálogo y devuelve un archivo. Verifica: exportar con un rango de fechas y contar las filas contra el mismo filtro aplicado a mano.
- [x] 2.2 Cabecera del archivo con los filtros usados y la fecha de generación.
- [x] 2.3 Caso sin resultados: mensaje, no archivo vacío.
- [x] 2.4 Verificar el aislamiento: una exportación pedida desde una marca no puede traer filas de la otra. **Test obligatorio.**

## 3. La entrega a sesión local

- [~] 3.1 **A medias — falta la prueba a mano.** Resolver el mecanismo de apertura de sesión en la máquina, con directorio de trabajo y prompt inicial. Probar a mano antes de integrar y anotar acá qué funcionó.
- [x] 3.2 Armar el contexto que recibe la sesión: operación, parámetros, script que la implementa, y qué revisar antes de aplicar.
- [x] 3.3 Confirmar que la aplicación no aplica nada por su cuenta: disparar una operación de escritura y verificar que ni los vaults ni el destino cambiaron hasta que la sesión lo hizo.

## 4. Captura y granularidad

- [x] 4.1 Input de ideas: campo de texto, guardado inmediato en cola local. Verifica: capturar con el destino inaccesible y confirmar que igual se guardó.
- [x] 4.2 Operación de publicación de la cola, idempotente. Verifica: publicar dos veces y confirmar que no hay duplicados.
- [x] 4.3 Mostrar la cola pendiente con su antigüedad, para que no se olvide.
- [~] 4.4 **A medias — el alcance existe, el botón en la fila no.** Acción por elemento: "sincronizar este" desde la fila de una pieza y desde la de un creativo. Verifica: afecta solo a ese, y el resultado coincide con el del lote.
- [x] 4.5 Botón de subir creativos de campañas, con su filtro de ronda.
- [x] 4.6 Confirmar que no existe ninguna forma de editar el cuerpo de una pieza desde la plataforma.

## 5. Completitud del catálogo

- [x] 5.1 Listar todo lo ejecutable del proyecto —`scripts/` y las skills operativas de los tres repos— y contrastarlo contra el catálogo. Anotar acá lo que falte.
- [x] 5.2 Para cada exclusión deliberada, dejar escrito el motivo.

## 6. El gating local

- [x] 6.1 Excluir del build compartido las rutas y manejadores de operación. **Estructural, no un `display: none`.** Verifica: construir para compartir y confirmar que las rutas no existen en el resultado.
- [x] 6.2 Confirmar que los efectos no viajan en peticiones de navegación. Verifica: recargar la consola varias veces y comprobar que no se ejecutó nada.
- [x] 6.3 Revisar que ningún parámetro se interpola crudo en un comando.

## 7. La antigüedad

- [x] 7.1 Leer `.state/last-run-<id>.json` y mostrar la antigüedad por operación, destacando las vencidas.
- [x] 7.2 Caso "nunca ejecutada" distinguido de "hace mucho".

## 8. Cerrar

- [x] 8.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 8.2 Build compartido y test de aislamiento otra vez: este change agrega superficie nueva.
- [x] 8.3 Anotar acá qué operaciones quedaron en el catálogo y cuáles se dejaron afuera a propósito.

---

# Cierre de la ETAPA 1 — 2026-09-24

Aplicados los bloques **1, 3, 4, 6 y 7**. El bloque 2 (exportaciones) **no se tocó**,
por decisión explícita: depende de `footer-contract-parser` y `account-scoped-routes`.
El bloque 5 (completitud del catálogo) tampoco entró en el alcance de esta sesión.

**Este change se adelantó en la fila.** El README del openspec lo pone después de los
changes 3 y 9. El 9 está aplicado; el **3 no**. La etapa 1 no toca datos de piezas, así
que no tiene exposición de privacidad, pero la consola vive en `/operar` suelta y se
mudará bajo el routing por marca cuando ese change cierre.

## Lo que quedó andando

```bash
GROWTH_CONSOLE=1 npm run dev     # http://localhost:3000/operar
```

Siete operaciones de etapa 1 en el catálogo, más dos de etapa 2 declaradas y no
ofrecidas:

| operación | forma | marca | estado hoy |
|---|---|---|---|
| `ideas-capturar` | captura | las dos | disparable, sin precondiciones a propósito |
| `ideas-publicar` | sesión | las dos | disparable |
| `ingest-analytics` | sesión | las dos | disparable |
| `sync-contenido` | sesión | las dos | **bloqueada: falta NOTION_TOKEN** |
| `sync-documentacion` | sesión | solo tegu | **bloqueada: falta NOTION_TOKEN** |
| `ads-subir-creativos` | sesión | solo tegu | **bloqueada: falta NOTION_TOKEN** |
| `digest` | sesión | solo mativallej | disparable |
| `export-piezas` | export | las dos | etapa 2, declarada y no ofrecida |
| `export-creativos` | export | solo tegu | etapa 2, declarada y no ofrecida |

Las tres bloqueadas lo están **bien**: el token de integración de Notion no existe en
`.env.local`, y la consola lo dice antes con el link de dónde sacarlo en vez de fallar
a mitad de la ejecución.

## Las decisiones que se tomaron acá

- **El gating es `pageExtensions`.** Los archivos de la consola se llaman
  `page.local.tsx` / `*.local.ts`, y esa extensión solo entra en `pageExtensions`
  cuando `GROWTH_CONSOLE=1` (`next.config.ts`). Sin la variable Next ni los reconoce
  como rutas: no hay ruta, no hay manejador, y nada de lo que importan entra al bundle.
- **La consola NO se linkea desde el nav.** Se probó y se revirtió: un link
  condicional deja `/operar` escrito en el chunk de cliente del build compartido, que
  es exactamente el `display:none` que el bloque 6 prohíbe. Se llega por URL directa
  hasta que `account-scoped-routes` separe layout local de compartido.
- **Los efectos viven solo en acciones de servidor** (`actions.local.ts`), que se
  invocan por POST desde un formulario. Un manejador GET se dispararía con que alguien
  abra la URL.
- **Ningún parámetro toca un shell.** El comando se arma como `argv`, y lo único que
  se interpola en el lanzador es la ruta del contexto, que la generó la app. El
  comando "sugerido" que se le muestra a la persona va citado, y esa string no se
  ejecuta desde la app.
- **Dos scripts crecieron, porque un filtro que no filtra es un control que miente.**
  `sync-notion.py` suma `--only <ruta>` (alcance por elemento, tarea 4.4) y
  `--ronda <n>` (tarea 4.5). Sin ellos, el selector de elemento y el de ronda habrían
  sido decoración.
- **`src/lib/repo.ts` resuelve la raíz del repo y se rompe si no la encuentra.** Es
  para `.state/`, que vive adentro del repo — distinto de los vaults, que son externos
  y por eso salen de `config/sources.json`. Aun así verifica: un `.state/` fantasma
  haría que todas las operaciones se vean como "nunca ejecutada".

## Verificaciones

| qué | cómo | resultado |
|---|---|---|
| 6.1 — la consola no existe en el build compartido | `npm run build` y grep sobre `.next` | **0** `.js` con `dispararOperacion`, `prepararEntrega`, `osascript`, `OPERACIONES` o `ideas-queue`; 0 rutas `/operar` en el manifiesto |
| 6.1 — sí existe en el local | `GROWTH_CONSOLE=1 npm run build` | `ƒ /operar` en la tabla de rutas |
| 6.2 — nada se dispara al navegar | `next start` + 5 GET a `/operar` y 1 a `/` | `.state/` idéntico, 0 handoffs, vaults sin cambios |
| 3.3 — la app no aplica | disparar `ingest-analytics` (operación que escribe) | único archivo escrito: `.state/handoff-ingest-analytics-*.md`. Los 286 `.md` de los dos vaults, con mtime y tamaño idénticos; `git status` de los dos, sin cambios |
| 4.4 — el alcance por elemento filtra de verdad | `sync-notion.py --only <ruta>` | ruta inexistente → corta con mensaje; ruta real → pasa el filtro y se topa con la precondición de NOTION_TOKEN |
| 4.5 — la ronda filtra de verdad | `sync-notion.py --scope ads --ronda 1` | `Ronda 1 - Jul 2026: 11 de 28 creativos`. Ronda 9 → corta |
| 4.6 — no se edita una pieza | test que escanea `src/` | solo dos módulos escriben en disco (`ideas-queue.ts`, `handoff.ts`), ninguno conoce la ruta de un vault, y hay **un** `<textarea>` en toda la app: el de captar una idea |
| 8.1 | `tsc` · `lint` · `test` · `build` | 0 errores · 0 errores (1 warning preexistente en `postcss.config.mjs`) · **62 tests** · 217 páginas |

## Lo que quedó a medias, y por qué

- **3.1 — falta la prueba a mano del mecanismo de sesión.** Está implementado
  (`lanzadorDe` en `src/lib/handoff.ts`: `osascript` → Terminal → `cd <repo> && claude
  '<prompt que apunta al contexto>'`), pero **no se pudo probar en esta sesión**: el
  clasificador de auto-mode bloqueó el `osascript` que automatiza Terminal, y no se
  buscó rodearlo. Falta correr la prueba a mano y anotar acá qué pasó — ojo que macOS
  pide permiso de Automatización la primera vez. Si el permiso no se da, la consola
  igual entrega: muestra el comando exacto y la ruta del contexto, que es la garantía
  que fija el spec (*la app no aplica; entrega con contexto suficiente*).
- **4.4 — el alcance por elemento existe, el botón en la fila no.** El catálogo lo
  declara, `sync-notion.py --only` lo implementa y la consola lo ofrece con el campo
  "Elemento". Lo que falta es el botón *desde la fila*: las vistas de piezas
  (`/inventario`, `/piezas`) son rutas **compartidas**, y meterles un disparador las
  volvería superficie de operación en un build que se comparte. Y los creativos no
  tienen fila en ningún lado todavía — eso es `ads-model`. El botón en la fila entra
  cuando `account-scoped-routes` separe las vistas.
- **4.1 — "con el destino inaccesible" se verifica por construcción.** No hay forma de
  apagar Notion desde un test. Lo que sí se chequea: `captar` no tiene ninguna ruta de
  red, la operación declara **cero** precondiciones, y guarda con escritura atómica
  (temporal + rename) en menos de 500 ms.
- **7.1 / 7.2 — el lector está, el escritor no.** Hoy las nueve operaciones muestran
  "nunca se ejecutó", que es la verdad: nada escribe todavía `.state/last-run-<id>.json`.
  Ese registro es la tarea 4.1 de `unschedule-everything`.
- **Bloque 5 (completitud) sin hacer.** El catálogo declara lo que pedía la tarea 1.1,
  pero **no** se barrió todo lo ejecutable de los tres repos. Quedaron afuera, sin
  motivo escrito todavía: `scripts/notify-ideas.py`, `scripts/notify-discord.py`, y las
  ~33 skills de `brain-*` / `growth-*` / `tegu-*`. Ojo con una que se vio de paso:
  `notify-ideas.py` vigila `Personal Brand/Content/Ideas` y `Create/Ideas`, **y ninguno
  de los dos existe ya** — las ideas se mudaron al destino de coordinación el
  2026-09-23.

---

# Cierre de la ETAPA 2 — 2026-09-26

La etapa 2 estaba esperando a `footer-contract-parser` y `account-scoped-routes`.
Los dos cerraron hoy, así que entró el **bloque 2 (exportaciones)** y el
**bloque 5 (completitud del catálogo)**.

`tsc` · `lint` (0 errores) · **178 tests** · build compartido y local OK.

## Las exportaciones (bloque 2)

`src/lib/export.ts` arma CSV en memoria y lo entrega al navegador. **No escribe
en disco**: un export que deja un archivo en una carpeta del repo crea una copia
que envejece en silencio, y la regla es que la verdad son los `.md`.

| requisito | cómo quedó |
|---|---|
| filtros del catálogo | marca, materia, canal, estado, desde, hasta — solo los que la operación DECLARA llegan al manejador |
| cabecera de procedencia | comentada con `#`: operación, fecha ISO, filtros aplicados y conteo de filas |
| sin resultados | **mensaje, no archivo vacío.** Un CSV con solo cabecera se abre y parece "no hay nada", cuando lo que pasó es que el filtro no dejó pasar nada |
| aislamiento | **test obligatorio, y pasa** |

**El aislamiento no es un filtro, es que el otro conjunto no se carga.** El
export llama `loadPieces([fuente])`, así que las piezas de la otra marca no se
leen. Y si la marca pedida no entró al build, el export corta nombrando las
disponibles — igual que su ruta no existe.

Un detalle que el test fija: **una pieza sin fecha queda FUERA de un rango, no
adentro**. No se puede afirmar que esté en el rango, y meterla la haría aparecer
en un export "de julio" sin que nadie sepa de cuándo es.

## La completitud del catálogo (bloque 5)

Barrido de `scripts/` al 2026-09-26. **Faltaban dos operaciones reales** y se
agregaron:

- **`auditar`** → `npm run audit`. Read-only de punta a punta.
- **`backfill-ids`** → `scripts/backfill-piece-id.py`. Dry-run por defecto, y
  entre lo que hay que revisar está que el vault esté commiteado — el script
  aborta si no, y tiene razón.

**Lo que queda afuera a propósito, con su motivo** (quedó escrito en el código,
arriba de `getOperation`):

| ejecutable | por qué no |
|---|---|
| `notify-discord.py` | es una primitiva que usan el digest y la cola. Ofrecerla suelta sería un botón de "mandar un mensaje" sin nada que decir |
| `notify-ideas.py` | **vigila dos carpetas que ya no existen** — las ideas se mudaron el 2026-09-23. Está huérfano: hay que borrarlo o reapuntarlo, no ofrecerlo |
| `cron-*.sh` | envoltorios de los trabajos que `unschedule-everything` apagó |
| las ~33 skills de los vaults | operación CREATIVA. Regla dura 7: eso vive en Obsidian |

## Lo que sigue a medias, con su motivo

- **3.1 — la prueba a mano del lanzador de sesión.** Sigue sin correrse: el
  `osascript` que automatiza Terminal necesita el permiso de Automatización de
  macOS, que se da una sola vez y con una persona presente. La consola entrega
  igual sin él —muestra el comando exacto y la ruta del contexto—, que es la
  garantía que fija el spec.
- **4.4 — el botón "sincronizar este" en la fila de una pieza.** Ahora *se
  podría*: las vistas están bajo `/[account]/` y la consola tiene su gating. No
  se hizo en esta sesión; queda como lo más chico que falta del change.

## La superficie nueva, verificada (tarea 8.2)

Este change y el de configuración agregan rutas locales. El build compartido
sigue sin ellas:

| qué | resultado |
|---|---|
| `/operar` y `/configuracion` en el manifiesto compartido | **0** |
| archivos de página de esas rutas | **0** |
| `guardarConfig` · `probarConexiones` · `SERVICE_ROLE` en el bundle compartido | **0** |
| con `GROWTH_CONSOLE=1` | aparecen `ƒ /operar` y `ƒ /configuracion` |
