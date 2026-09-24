# Design

## Las cuatro opciones, evaluadas

| | Corre sin la Mac | Ve el vault | Avisa si falla | Costo |
|---|---|---|---|---|
| launchd local (hoy) | no | **sí, en vivo** | **no** | 0 |
| Orquestador en la nube | sí | **no** | sí | servicio nuevo + credencial |
| Orquestador self-hosted en la Mac | no | sí | sí | contenedor a mantener |
| Agente agendado en la nube | sí | solo lo commiteado y pusheado | sí | tokens de modelo |

Un orquestador self-hosted es launchd con un contenedor encima: misma dependencia de
que la máquina esté prendida, más superficie que mantener. Uno en la nube no puede
leer archivos locales. Un agente agendado en la nube ve el repo, no el disco: al
2026-09-24 eso son **11 commits de diferencia**.

**Ninguna de las tres alternativas resuelve el defecto real, que es el silencio.**
Y las tres cuestan más que arreglarlo.

## La reorganización que sí sirve

El movimiento correcto no es cambiar de scheduler: es **cambiar qué lee cada
trabajo**. Ahora que el tablero existe, casi todo el digest se puede calcular desde
ahí —cadencia sale de fecha y estado, deuda sale del último corte, el pipeline sale
de los carriles— y entonces el trabajo deja de depender del disco.

```
vault (local, donde se crea)
   ↓  sincronización  ← lo único que necesita la Mac
tablero (compartido)
   ↓  digest, avisos
canal humano
```

Eso deja **un solo** trabajo atado a la máquina. Y sobre ese uno, la propuesta es no
agendarlo: que lo dispare la persona cuando terminó de crear. Es más coherente con
la regla del proyecto —el vault es para crear, el tablero para colaborar— y elimina
la credencial necesaria para correr sin sesión interactiva.

## El nuevo silencio, y cómo se cubre

Esta arquitectura introduce un modo de falla propio: **si el sync no corrió, el
digest reporta sobre datos viejos sin saberlo.** Se cubre haciendo que el digest
declare la antigüedad de los datos sobre los que informa. Un digest que dice "esto
mide hasta hace seis días" es honesto; uno que no lo dice, no.

## Por qué "no corrió" es distinto de "falló"

Un trabajo que falla puede avisar. Uno que **no se ejecuta** no puede avisar nada:
no hay proceso. La única forma de detectarlo es desde afuera, comprobando que la
última señal de vida esté dentro de la ventana esperada. Los dos casos de hoy son
del segundo tipo, que es el que ningún try/catch cubre.
