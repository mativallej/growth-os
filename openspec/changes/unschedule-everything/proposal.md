# Proposal

## Why

Hay dos trabajos agendados en la Mac y **los dos fallan sin que nadie se entere**
(medido el 2026-09-24):

1. **El digest semanal nunca corrió.** `com.mativallej.growth-digest` dispara los lunes 09:00 y el plist se creó el martes 23. Genera bien —verificado a mano— pero el tramo cron → canal humano no se ejecutó nunca.
2. **El aviso de ideas corrió una sola vez.** `logs/ideas.log` tiene una única entrada, `2026-09-23 13:55`, con intervalo configurado de 7200 segundos. Pasaron ~23 horas sin una segunda corrida.

La causa del silencio es la misma: `scripts/cron-digest.sh` hace
`exec >> logs/digest.log 2>&1`. **El único testigo de una falla es un archivo que
nadie abre.**

La primera versión de este change proponía arreglar el silencio: avisos de falla,
marca de última corrida, chequeo de latido. **Se descarta.** La decisión es más
simple y más honesta: **nada corre solo.**

Las razones se acumularon durante el relevamiento:

- **Todo lo que estos trabajos leen son archivos locales**, y la copia de GitHub del vault personal tiene 11 commits sin pushear más una pieza sin commitear. Cualquier cosa desatendida trabaja sobre una foto vieja sin saberlo.
- **Correr sin sesión interactiva exige una credencial** que duplica el acceso que ya existe cuando una persona está presente.
- **Las operaciones que importan piden criterio**: qué se sincroniza, qué alcance, qué se sube y qué no. Un cron no puede decidir nada de eso, así que o decide mal o decide por default — que es lo mismo.
- Y lo más importante: **un trabajo agendado que nadie mira genera la confianza de que algo se está mirando.** Eso es peor que no tenerlo.

## What Changes

- Se descargan y eliminan los dos agentes de launchd. Nada queda agendado.
- Los scripts **se conservan**: siguen siendo la implementación, y pasan a invocarse desde la consola de operaciones (`operations-console`).
- `scripts/cron-digest.sh` y `scripts/cron-ideas.sh` dejan de redirigir su salida a un log: reportan a quien los disparó.
- Desaparece la necesidad de una credencial de servicio para el camino normal. La credencial queda como opción para quien quiera correr los scripts sin sesión de agente.

**No incluye:** la consola ni los botones. Eso es `operations-console`. Este change
solo apaga lo que hoy corre solo y fija que nada vuelva a hacerlo por descuido.

## Capabilities

### New Capabilities

- `manual-execution`: la garantía de que ninguna operación del sistema ocurre sin que una persona la haya disparado, y de que el resultado se le informa a esa persona en el momento.

### Removed Capabilities

*(ninguna — la capability `scheduling` que proponía la versión anterior de este change nunca llegó a existir)*

## Impact

**Sistema.** Se eliminan `com.mativallej.growth-digest` y `com.mativallej.growth-ideas` de LaunchAgents.

**Código.** `scripts/cron-digest.sh`, `scripts/cron-ideas.sh` (renombrados y sin redirección de log).

**Lo que se pierde, dicho explícitamente.** El digest deja de llegar los lunes por su cuenta. Si nadie aprieta el botón, no hay digest. Es el costo aceptado de no tener automatismos que fallan mudos, y la mitigación no es un cron: es que la consola muestre hace cuánto no se corre cada operación.

**Riesgo.** El modo de falla se invierte: antes era "corre mal y no te enterás", ahora es "no corre y no te acordás". El segundo es visible; el primero no. Por eso se acepta.
