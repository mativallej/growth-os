# Tasks

> **Sesión del 2026-09-24 — bloque 1 aplicado. Nada queda agendado.**
>
> `com.mativallej.growth-digest` y `com.mativallej.growth-ideas` descargados y sus
> plists eliminados (copia en `~/.claude/backups/`). Auditoría completa: sin crontab,
> sin otros LaunchAgents del proyecto, sin LaunchDaemons. Los únicos LaunchAgents que
> quedan son de terceros (Google, Homebrew, MEGA, ScreenPal).
>
> **Dato que quedó sin explicar:** al descargarlos, `growth-ideas` reportaba estado de
> salida **126** ("cannot execute"), que es coherente con que haya corrido una sola vez
> en 23 horas. Pero los dos scripts son ejecutables (`-rwxr-xr-x`), así que el permiso
> no era la causa. No se investigó más porque los agentes ya no existen; si alguna vez
> se vuelve a agendar algo, empezar por acá.

## 1. Apagar lo que corre solo

- [x] 1.1 `launchctl bootout` de `com.mativallej.growth-digest` y `com.mativallej.growth-ideas`. Verifica: `launchctl list | grep mativallej` → vacío.
- [x] 1.2 Borrar los dos `.plist` de `~/Library/LaunchAgents/`. Verifica: `ls ~/Library/LaunchAgents/com.mativallej.*` → no existe.
- [x] 1.3 Buscar cualquier otro agendado del proyecto: `crontab -l`, `launchctl list`, y los `StartInterval`/`StartCalendarInterval` de LaunchAgents. Anotar acá el resultado, aunque sea vacío.

## 2. Los scripts dejan de comportarse como crons

- [x] 2.1 Sacar `exec >> logs/*.log 2>&1` de `scripts/cron-digest.sh` y `scripts/cron-ideas.sh`: la salida va a quien los invoca.
- [x] 2.2 Renombrarlos sin el prefijo `cron-`, que ya miente. Actualizar las referencias.
- [x] 2.3 Confirmar que cada uno corre a mano y reporta en pantalla. Verifica: ejecutarlos y ver el resultado sin abrir ningún archivo.

## 3. Idempotencia

- [ ] 3.1 Verificar que el sync se puede interrumpir y repetir sin duplicar filas: el estado en `.state/` ya lo cubre para docu; confirmar el caso de filas.
- [ ] 3.2 Escribir el test de la interrupción: aplicar parte, cortar, repetir, y confirmar que no hay duplicados.

## 4. La marca de última corrida

- [x] 4.1 Cada operación escribe `.state/last-run-<id>.json` al terminar con éxito. Es lo que después lee la consola.

## 5. Cerrar

- [x] 5.1 Dejar escrito acá qué quedó apagado y con qué fecha.
- [x] 5.2 Confirmar que `.env.local` ya no necesita credencial de servicio para el camino normal, y anotar para qué sigue sirviendo si se conserva.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **208 tests**.

## Re-auditoría de agendados (tarea 1.3, repetida hoy)

| dónde | resultado |
|---|---|
| `crontab -l` | *no crontab for matiasvallejos* |
| `launchctl list` filtrando mativallej/growth | **0** |
| `~/Library/LaunchAgents/` del proyecto | **0** |
| `/Library/LaunchDaemons/` del proyecto | **0** |

**Nada del proyecto corre solo.** Dos días después de apagarlo, sigue apagado.

## Los scripts dejaron de comportarse como crons (bloque 2)

| antes | ahora |
|---|---|
| `scripts/cron-digest.sh` | `scripts/digest.sh` |
| `scripts/cron-ideas.sh` | `scripts/publicar-ideas.sh` |

El prefijo `cron-` mentía desde el 2026-09-24. Y **se sacó el
`exec >> logs/*.log 2>&1`**, que es lo que hacía que un fallo pasara
desapercibido: los dos agendados que existían fallaron exactamente así —uno
nunca corrió y el otro corrió una vez en 23 horas— y nadie se enteró porque la
salida iba a un archivo que nadie abría.

Hay un test que **falla si cualquier `.sh` de `scripts/` vuelve a tragarse su
salida**, y otro que falla si reaparece un script con prefijo `cron-`.

`digest.sh` además ahora verifica que la skill del vault exista antes de correr,
y si no, dice cómo reapuntar el vault en vez de explotar con un "file not found".

### Verificación 2.3, corrida de verdad

```
$ bash scripts/publicar-ideas.sh
Ideas nuevas · 2026-09-26 02:40
ideas encontradas: 0 · ya vistas: 25 · nuevas: 0
Nada nuevo.

$ bash scripts/digest.sh
Digest de growth · 2026-09-26 02:40
→ marca mativallej · canal #growth-mativallej · 1 mensaje(s)
   1/1 → HTTP 204
```

Los dos reportan en pantalla sin abrir ningún archivo. **Ojo: la corrida del
digest posteó un mensaje real** al canal — era la única forma de verificar que
funciona de punta a punta, pero salió un digest de verdad.

Y el de ideas confirma de paso lo que se anotó en el catálogo de operaciones:
`notify-ideas.py` encuentra **0 ideas** porque vigila dos carpetas que ya no
existen.

## La marca de última corrida (tarea 4.1)

`src/lib/last-run.ts` la leía y **nadie la escribía**, así que las nueve
operaciones se veían como "nunca se ejecutó" para siempre. Ahora existe
`src/lib/marcar-corrida.ts` y la consola la escribe al preparar una entrega.

Dos decisiones que quedaron en el código:

- **Solo se marca el éxito.** Una corrida fallida que dejara marca haría que la
  antigüedad diga "al día" un minuto después de explotar, que es peor que no
  tener el dato.
- **Se marca la PREPARACIÓN, no la aplicación.** Es lo que esta app hace; lo que
  la sesión local decida aplicar después no lo sabe nadie acá, y decir "al día"
  porque se abrió una terminal sería afirmar de más.

Esto no es decorativo: es la mitigación del costo que se aceptó al apagar todo.
Si nada corre solo, lo que puede pasar es que nadie apriete el botón — y lo
único que hace que eso se note es ver hace cuánto que no se aprieta.

## La credencial de servicio (tarea 5.2)

**El camino normal ya no la necesita.** Las operaciones que tocan Notion se
disparan desde una sesión con MCP, que está autenticada por la persona presente.

Sigue sirviendo para una sola cosa: **correr los scripts sin sesión de agente**,
por ejemplo un `sync-notion.py` desde otra máquina o dentro de un contenedor. Por
eso `NOTION_TOKEN` se conserva como precondición declarada de tres operaciones —
la consola avisa si falta, con el link de dónde sacarlo, en vez de fallar a mitad
de la ejecución.

## Lo que quedó sin hacer

- **3.1 y 3.2 — el test de la interrupción del sync.** Requiere aplicar parte de
  un sync contra Notion, cortarlo y repetirlo. La integración todavía no tiene la
  página Growth compartida, así que no se puede aplicar nada para después
  interrumpirlo. Es lo único del change que sigue bloqueado.
