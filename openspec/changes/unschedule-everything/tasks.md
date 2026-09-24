# Tasks

## 1. Apagar lo que corre solo

- [ ] 1.1 `launchctl bootout` de `com.mativallej.growth-digest` y `com.mativallej.growth-ideas`. Verifica: `launchctl list | grep mativallej` → vacío.
- [ ] 1.2 Borrar los dos `.plist` de `~/Library/LaunchAgents/`. Verifica: `ls ~/Library/LaunchAgents/com.mativallej.*` → no existe.
- [ ] 1.3 Buscar cualquier otro agendado del proyecto: `crontab -l`, `launchctl list`, y los `StartInterval`/`StartCalendarInterval` de LaunchAgents. Anotar acá el resultado, aunque sea vacío.

## 2. Los scripts dejan de comportarse como crons

- [ ] 2.1 Sacar `exec >> logs/*.log 2>&1` de `scripts/cron-digest.sh` y `scripts/cron-ideas.sh`: la salida va a quien los invoca.
- [ ] 2.2 Renombrarlos sin el prefijo `cron-`, que ya miente. Actualizar las referencias.
- [ ] 2.3 Confirmar que cada uno corre a mano y reporta en pantalla. Verifica: ejecutarlos y ver el resultado sin abrir ningún archivo.

## 3. Idempotencia

- [ ] 3.1 Verificar que el sync se puede interrumpir y repetir sin duplicar filas: el estado en `.state/` ya lo cubre para docu; confirmar el caso de filas.
- [ ] 3.2 Escribir el test de la interrupción: aplicar parte, cortar, repetir, y confirmar que no hay duplicados.

## 4. La marca de última corrida

- [ ] 4.1 Cada operación escribe `.state/last-run-<id>.json` al terminar con éxito. Es lo que después lee la consola.

## 5. Cerrar

- [ ] 5.1 Dejar escrito acá qué quedó apagado y con qué fecha.
- [ ] 5.2 Confirmar que `.env.local` ya no necesita credencial de servicio para el camino normal, y anotar para qué sigue sirviendo si se conserva.
