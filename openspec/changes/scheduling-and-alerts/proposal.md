# Proposal

## Why

Hay dos trabajos agendados en la Mac y **los dos están fallando sin que nadie se
entere** (medido el 2026-09-24):

1. **El digest semanal nunca corrió.** `com.mativallej.growth-digest` dispara los lunes 09:00 y el plist se creó el martes 23. Genera bien —se verificó a mano— pero el tramo cron → Discord no se ejecutó nunca.
2. **El aviso de ideas corrió una sola vez.** `logs/ideas.log` tiene una única entrada, `2026-09-23 13:55`, con un intervalo configurado de 7200 segundos. Pasaron ~23 horas sin una segunda corrida.

La causa de que nadie se entere es la misma en los dos: `scripts/cron-digest.sh`
hace `exec >> logs/digest.log 2>&1`. **El único testigo de una falla es un archivo
que nadie abre.** Un trabajo agendado que falla en silencio es peor que no tenerlo:
genera la confianza de que algo se está mirando.

Y hay un problema de diseño encima: el aviso de ideas vigila carpetas del vault,
pero las ideas **viven solo en Notion** desde el 2026-09-23. Está vigilando un lugar
donde ya no pasa nada.

**Por qué no alcanza con mover los crons a otra parte.** La pregunta natural es
sacarlos de la Mac. Pero todo lo que estos trabajos leen son archivos locales, y la
copia de GitHub del vault personal tiene **11 commits sin pushear** más una pieza
sin commitear. Cualquier cosa que corra fuera de la Mac calcularía la cadencia sin
ver la pieza que se acaba de grabar, que es justo lo que el digest tiene que mirar.
Mover el scheduler no arregla nada mientras la fuente de verdad sea el disco.

## What Changes

**La decisión: dónde corre cada trabajo lo decide dónde vive el dato que lee.**

| Trabajo | Lee | Dónde corre |
|---|---|---|
| Sincronizar vault → Notion | archivos locales | la Mac |
| Ingerir un export de analytics | un CSV descargado | la Mac, a mano |
| Digest de cadencia y deuda | el tablero, una vez sincronizado | fuera de la Mac |
| Aviso de idea nueva | el tablero | automatización del propio destino |

- Todo trabajo agendado SHALL avisar por el canal humano cuando falla, y cuando **no corre** en su ventana.
- El aviso de ideas deja de vigilar carpetas del vault.
- El digest se recalcula desde el tablero, no desde el vault. Lo único que hoy es exclusivo del vault —la frescura de los exports por canal— se resuelve aparte o se declara como pendiente.

**No incluye:** montar un orquestador nuevo. La evaluación está en `design.md` y el resultado es que no hace falta.

## Capabilities

### New Capabilities

- `scheduling`: qué trabajos corren solos, dónde corre cada uno y por qué, y cómo se entera un humano de que uno falló o no corrió.

### Modified Capabilities

*(ninguna)*

## Impact

**Código.** `scripts/cron-digest.sh`, `scripts/cron-ideas.sh` (modificados) · los plists de launchd · `scripts/notify-ideas.py` (deja de usarse contra el vault).

**Costo.** Cero servicios nuevos.

**Riesgo.** El digest calculado desde el tablero mide lo que el sync subió, no el vault. **Si el sync no corrió, el digest miente por omisión y no lo sabe.** Por eso el aviso de "no corrió" es un requirement y no una mejora: sin él, esta arquitectura cambia un silencio por otro.
