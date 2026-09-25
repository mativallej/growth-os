# Proposal

## Why

**La identidad de una pieza es su ruta, y la ruta cambia.**

`scripts/sync-notion.py` empareja una fila del tablero con su `.md` por la ruta
relativa del archivo — la columna `Archivo`. Es lo mejor disponible hoy: sobrevive a
renombrar el título, pero no a mover el archivo.

El 2026-09-24 se fusionaron los dos pipelines de contenido de Tegu (D-11). El costo
quedó medido: **57 filas del tablero con la llave rota**, y el sync de Tegu bloqueado
con `--apply` hasta resolverlo (`move-resilient-keys`).

Se intentó resolverlo sin id, emparejando por evidencia. El intento está documentado
en `move-resilient-keys/tasks.md`, nota del 2026-09-24 17:40:

> Se aplicaron 14 filas y **las 14 rutas escritas ya estaban muertas minutos después**.
> Otra sesión estaba reestructurando `tegu-growth` en paralelo […] y movió los archivos
> otra vez entre la medición y la escritura.
>
> **La conclusión no es que el emparejamiento esté mal. Es que no se puede re-llavear
> contra un vault que alguien está reorganizando.**

El criterio de emparejamiento funcionó: descartó un falso positivo, dos colisiones y
dos matches que venían de citas cruzadas. **Lo que falla es que no hay nada estable
contra qué emparejar.**

D-9 traía escrita su condición de reapertura — *"que la reconciliación por evidencia
resulte insuficiente en la práctica"* — y se cumplió el mismo día. La decisión quedó
reabierta el 2026-09-24.

## What Changes

- Cada pieza lleva **un identificador propio en su footer**, asignado una vez y nunca
  reasignado. Sobrevive a mover el archivo, renombrarlo, cambiarle la carpeta y
  reorganizar el vault entero.
- El identificador es **opaco y corto**. No codifica red, fecha, fórmula ni orden:
  cualquier cosa que codifique es una cosa más que se desactualiza.
- **Un backfill de una sola vez** sobre las piezas existentes: al 2026-09-24 son ~265
  entre los dos vaults (114 en `tegu-growth`, 151 en `brain`, contadas con `find` sobre
  las carpetas de contenido).
- Las skills que **crean** piezas asignan el id al nacer. Ninguna otra cosa lo escribe.
- El puente con Notion pasa a llavear por id. La ruta queda como dato informativo, no
  como llave.

## Impact

- **Contradice una regla del repo, y hay que aceptarlo explícitamente.** *"NO REESCRIBIR
  LOS `.md` PARA NORMALIZARLOS. El dashboard se adapta al vault, no al revés."* Un id no
  es una normalización de estilo: es la condición para que algo afuera del vault pueda
  referirse a una pieza sin romperse. La alternativa ya se probó y costó 57 filas más
  14 escrituras muertas.
- **Toca los dos vaults**, y el personal también. El id no dice nada de la pieza, así
  que no filtra contenido entre marcas: es un token opaco.
- **Desbloquea** `move-resilient-keys` (llave estable contra la cual reconciliar) y
  **D-15** (un índice derivado sobre la ruta hereda la misma llave rota, una capa más
  abajo).
- **Si la fuente falta**, REGLA DURA 1: una pieza sin id se reporta como tal y se
  cuenta. **No se le inventa uno al leer** — un id generado en lectura sería distinto en
  cada build y sería peor que no tenerlo.
- **No toca `slugify` ni las URLs.** El id es un campo del footer, no la ruta ni el
  slug. Los 16 archivos con acentos en el path siguen igual.

## Lo que queda abierto

- **La forma exacta del identificador.** La propuesta es un token corto y opaco; el
  largo y el alfabeto los define Matías. Lo que no es negociable es que sea opaco: un
  id que codifique red o fecha vuelve a envejecer.
- **Qué pasa si alguien duplica un archivo** para partir de él. El spec exige detectar
  y reportar ids repetidos; **qué hacer con ellos** — renumerar el nuevo, o fallar — es
  decisión de operación, no de lectura.
