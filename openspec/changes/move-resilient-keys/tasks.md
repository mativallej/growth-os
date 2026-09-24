# Tasks

> **Urgente. Hasta que cierre, no correr el sync de Tegu con `--apply`:** crearía 93
> filas duplicadas y dejaría 57 huérfanas.

> **Intento fallido del 2026-09-24 17:40 — leer antes de reintentar.**
>
> Se calculó el mapeo de las 57 filas emparejando por slug largo y distintivo, con
> guards contra ambigüedad, contra colisión de destino y contra apuntar fuera de
> `Create/Organic`. El criterio funcionó: descartó 1 falso positivo que apuntaba a un
> creativo de ads, 2 colisiones y 2 matches que venían de citas cruzadas en el
> contenido, no de identidad.
>
> **Se aplicaron 14 filas y las 14 rutas escritas ya estaban muertas minutos después.**
> Otra sesión estaba reestructurando `tegu-growth` en paralelo —9 commits entre las
> 15:57 y las 17:36, el último a tres minutos de la escritura— y movió los archivos
> otra vez entre la medición y la escritura.
>
> **La conclusión no es que el emparejamiento esté mal. Es que no se puede re-llavear
> contra un vault que alguien está reorganizando.** De ahí el requirement del estado
> detenido. Antes de reintentar: confirmar que tegu-growth no tiene trabajo en curso.
>
> Estado actual del tablero: 14 filas apuntan a rutas `Create/Organic/...` muertas,
> 14 siguen en `Brand/...` muertas, el resto sin tocar. Ninguna quedó peor que antes
> —muerta por muerta— pero el trabajo hay que rehacerlo entero.

## 1. El freno, primero

- [ ] 1.1 Detectar la condición de mudanza: registros sin archivo por encima de un umbral, junto con archivos sin registro. Verifica: correr contra el estado actual de Tegu y confirmar que se detiene.
- [ ] 1.2 El mensaje tiene que ser accionable: cuántos huérfanos, cuántos sin registro, y qué hacer. No un error genérico.
- [ ] 1.3 Test del caso normal: archivos nuevos sin pérdidas → no se frena.

## 2. La reconciliación

- [ ] 2.1 Definir la evidencia que basta para afirmar que dos elementos son la misma pieza. Empezar por lo más fuerte —la pieza publicada con la misma url, o el mismo nombre de archivo con el mismo contenido— antes que por heurísticas flojas.
- [ ] 2.2 Emparejar solo lo inequívoco; listar lo ambiguo con sus candidatos. Verifica: test con dos candidatos plausibles → no empareja.
- [ ] 2.3 Informar cada cambio de llave con origen y destino.
- [ ] 2.4 Dry-run por defecto, como el resto.

## 3. Reparar lo que ya está roto

- [ ] 3.0 **Confirmar que tegu-growth está quieto** antes de empezar: sin sesiones trabajando, árbol limpio, y anotar el SHA. Verificar el mismo SHA antes de aplicar.
- [ ] 3.1 Correr la reconciliación en dry-run contra las 57 filas afectadas de Tegu y revisar el mapeo propuesto **una por una** antes de aplicar.
- [ ] 3.2 Aplicar. Verifica: cero filas huérfanas, cero duplicados, y el recuento del tablero sin cambios.
- [ ] 3.3 Confirmar que estado, fecha, url y último corte de cada fila sobrevivieron.

## 4. El mismo problema en la documentación

- [ ] 4.1 `scripts/sync-notion-docs.py` indexa su estado por ruta en `.state/`. Una carpeta de docu que se mueva duplicaría páginas. Aplicar el mismo freno.
- [ ] 4.2 Verificar contra la reorganización que ya ocurrió: `Brand/Identity` y compañía ya no existen, y la docu todavía no se subió nunca — así que acá el daño no llegó a producirse. Confirmarlo antes de la primera subida.

## 5. Cerrar

- [ ] 5.1 Anotar acá el mapeo aplicado y cuántas filas se re-emparejaron.
- [ ] 5.2 Revisar si la deuda declarada en `notion-bridge-contract` (tarea 4.1) queda saldada o cambia de forma.
