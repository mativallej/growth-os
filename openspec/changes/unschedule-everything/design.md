# Design

## Las cuatro opciones que se evaluaron, y por qué ninguna se eligió

| | Corre sin la Mac | Ve el vault | Avisa si falla | Costo |
|---|---|---|---|---|
| launchd local (lo que había) | no | **sí, en vivo** | **no** | 0 |
| Orquestador en la nube | sí | **no** | sí | servicio nuevo + credencial |
| Orquestador self-hosted en la Mac | no | sí | sí | contenedor a mantener |
| Agente agendado en la nube | sí | solo lo commiteado y pusheado | sí | tokens de modelo |

Un orquestador self-hosted es launchd con un contenedor encima: misma dependencia de
que la máquina esté prendida, más superficie que mantener. Uno en la nube no puede
leer archivos locales. Un agente agendado en la nube ve el repo, no el disco: al
2026-09-24 eso son 11 commits de diferencia.

Las tres alternativas resolvían el silencio y ninguna resolvía lo de fondo: **que
estas operaciones no deberían decidirse solas.**

## Lo que reemplaza al agendado

No un scheduler mejor: **una consola**. El trabajo no desaparece, cambia de
disparador. Y al pasar a tener una persona presente en cada ejecución, tres cosas
dejan de ser problema:

- El resultado se ve en el momento, así que no hace falta un canal de alertas para enterarse de una falla.
- El alcance se elige cada vez, en vez de quedar congelado en un default.
- La credencial de servicio deja de ser necesaria, porque la sesión ya está autenticada.

## El modo de falla nuevo

Sin automatismos, la falla posible es el olvido. No se cubre con un recordatorio
automático —volveríamos al principio— sino con visibilidad: **la consola muestra
hace cuánto no se ejecuta cada operación**, y eso alcanza cuando la consola es la
pantalla desde la que se trabaja. Un dato viejo a la vista es mejor recordatorio que
una notificación que se aprende a ignorar.
