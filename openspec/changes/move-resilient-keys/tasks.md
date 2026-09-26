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

- [x] 1.1 Detectar la condición de mudanza: registros sin archivo por encima de un umbral, junto con archivos sin registro. Verifica: correr contra el estado actual de Tegu y confirmar que se detiene.
- [x] 1.2 El mensaje tiene que ser accionable: cuántos huérfanos, cuántos sin registro, y qué hacer. No un error genérico.
- [x] 1.3 Test del caso normal: archivos nuevos sin pérdidas → no se frena.

## 2. La reconciliación

- [x] 2.1 Definir la evidencia que basta para afirmar que dos elementos son la misma pieza. Empezar por lo más fuerte —la pieza publicada con la misma url, o el mismo nombre de archivo con el mismo contenido— antes que por heurísticas flojas.
- [ ] 2.2 Emparejar solo lo inequívoco; listar lo ambiguo con sus candidatos. Verifica: test con dos candidatos plausibles → no empareja.
- [ ] 2.3 Informar cada cambio de llave con origen y destino.
- [x] 2.4 Dry-run por defecto, como el resto.

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

---

# Cierre parcial — 2026-09-26

**El freno está puesto y probado. La reparación sigue bloqueada, y ahora por dos
cosas concretas y nombradas.**

## El freno (bloque 1) — hecho

`detectar_mudanza` en `scripts/sync-notion.py`. Frena cuando hay **muchas filas
huérfanas Y muchos archivos sin fila a la vez** — que es la firma de una mudanza.
Muchas huérfanas solas pueden ser un borrado real; huérfanas *más* archivos
nuevos son las mismas piezas en otro lado.

El mensaje es accionable, no genérico:

```
FRENO: esto parece una mudanza del vault, no piezas borradas.

  57 filas del tablero apuntan a archivos que no existen (45% del tablero)
  93 archivos del vault no tienen fila

Aplicar ahora crearía 93 filas duplicadas y dejaría 57 huérfanas, con su
estado del kanban y su historial adentro.

Qué hacer:
  1. python3 scripts/reconciliar-llaves.py --brand <marca>   (dry-run)
  2. revisar los emparejamientos que propone
  3. volver a correr el sync

Para saltear este freno a sabiendas: --sin-freno
```

Cuatro tests lo fijan, incluido el caso normal que **NO** tiene que frenar (diez
piezas nuevas y ninguna huérfana) y el borrado masivo sin archivos nuevos, que
tampoco frena porque puede ser real.

## La reconciliación (bloque 2) — el esqueleto, con el freno adelante

`scripts/reconciliar-llaves.py`, dry-run por defecto. **Lo primero que hace es
exigir que el vault esté quieto**, y eso no es una precaución: es exactamente lo
que faltó el 2026-09-24, cuando las 14 rutas escritas estaban muertas minutos
después porque otra sesión seguía moviendo archivos.

Verificado ahora mismo contra Tegu:

```
tegu · Tegu
  129 piezas · 0 con id de footer
  ABORTADO: el vault tiene 3 archivo(s) sin commitear.
```

La evidencia quedó ordenada de la más fuerte a la más floja —mismo `id` (100),
misma `url` publicada (90), mismo nombre de archivo (60)— con la regla de
emparejar **solo lo inequívoco** y listar lo ambiguo con sus candidatos.

## Lo que cambió respecto de cuando se escribió este change

**`stable-piece-id` cerró, y eso vuelve esta reparación un trabajo de una sola
vez.** Con el `id` en el footer, el puente llavea por él y una mudanza deja de
romper nada: la ruta pasó a ser dato informativo que se actualiza solo.

El script lo dice cuando corresponde: si todas las piezas tienen id, avisa que la
reconciliación no hace falta y termina.

## Los dos bloqueos, nombrados

1. **El vault de Tegu tiene 3 archivos sin commitear.** El script aborta, y tiene
   razón.
2. **El backfill de ids no corrió**, por lo mismo. Hoy las 129 piezas de Tegu
   tienen **0 ids**, así que la llave sigue siendo la ruta.

**El orden para desbloquear todo esto es uno solo:**

```bash
# 1. dejar quieto el vault (commitear o descartar)
# 2. python3 scripts/backfill-piece-id.py --brand tegu --apply
# 3. python3 scripts/reconciliar-llaves.py --brand tegu
# 4. python3 scripts/sync-notion.py --brand tegu --scope posts        (dry-run)
```

El paso 4 además necesita que la integración tenga acceso a la página Growth.

## Lo que sigue sin hacer

- **2.2, 2.3 y el bloque 3 entero** (reparar las 57 filas): necesitan leer el
  tablero, y eso necesita el acceso a Notion.
- **El aviso del README** de no correr el sync de Tegu con `--apply` **sigue
  vigente**, pero ahora hay un freno que lo hace cumplir solo.
