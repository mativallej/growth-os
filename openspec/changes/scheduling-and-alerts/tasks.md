# Tasks

## 1. Parar de mentir (se puede hacer hoy, sin credenciales)

- [ ] 1.1 `scripts/cron-digest.sh` y `scripts/cron-ideas.sh`: `trap` de error que manda el fallo al canal humano por el webhook, además del log. Verifica: forzar un error y confirmar que llega el aviso.
- [ ] 1.2 Cada trabajo escribe su última ejecución con éxito en `.state/last-run-<trabajo>.json`.
- [ ] 1.3 Un chequeo de latido que compara esa marca contra la ventana esperada y avisa si se pasó. Verifica: retrasar la marca a mano y confirmar el aviso.
- [ ] 1.4 Investigar por qué el trabajo con intervalo de 2 horas corrió una sola vez en 23. Verifica: `log show --predicate 'process == "launchd"'` filtrando por la etiqueta, y confirmar dos corridas consecutivas.

## 2. Correr el digest de punta a punta antes del lunes

- [ ] 2.1 Disparar el trabajo a mano y confirmar que el mensaje llega al canal. **Hasta que esto pase, el digest nunca se ejecutó completo.**
- [ ] 2.2 Anotar acá qué llegó.

## 3. Reorganizar por dónde vive el dato

- [ ] 3.1 Reescribir el digest para que calcule cadencia, deuda y pipeline desde el tablero. Verifica: comparar su salida contra la versión que lee el vault; las diferencias tienen que explicarse por lo que falta sincronizar, y ninguna otra.
- [ ] 3.2 Agregar al digest la antigüedad de los datos, derivada de la última sincronización con éxito.
- [ ] 3.3 Reemplazar el aviso de ideas por la automatización nativa del destino. Verifica: crear una idea de prueba y confirmar que llega el aviso.
- [ ] 3.4 Retirar `scripts/notify-ideas.py` del agendado y dejar escrito por qué queda en el repo, si queda.
- [ ] 3.5 Resolver la frescura de exports por canal, que hoy es lo único exclusivo del vault: subirla al tablero, o declararla explícitamente fuera del digest.

## 4. Cerrar

- [ ] 4.1 Confirmar que cada trabajo agendado tiene: aviso de falla, marca de última corrida y chequeo de latido.
- [ ] 4.2 Dejar escrito acá qué trabajo corre dónde y con qué ventana.
