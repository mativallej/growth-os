# OpenSpec — growth-loop

**177 de 211 tareas al 2026-09-26.** Los catorce changes se tocaron; cinco
cerraron completos y los nueve restantes tienen su parte bloqueada anotada, con
el motivo y el comando que la desbloquea.

## Qué es esto

La capa de operación y medición del growth de dos marcas que no se fusionan.
Tres capas, y la división entre ellas es la decisión de fondo:

```
vaults de Obsidian + agentes   →   CREAR. La verdad vive acá
el destino de colaboración     →   COORDINAR con el equipo
growth-loop                    →   MEDIR: captar, sincronizar, exportar, ingerir
```

Un verbo por capa. **Nada corre solo:** toda operación la dispara una persona
desde la consola — la app prepara, una sesión local ejecuta, la persona aprueba.

## El estado

| # | Change | Estado |
|---|---|---|
| 1 | `fail-loud-sources` | ✅ **completo** |
| 2 | `footer-contract-parser` | ✅ **completo** |
| 3 | `account-scoped-routes` | ✅ **completo** |
| 4 | `growth-views` | ✅ **completo** |
| 6 | `operations-console` | ✅ **completo** (etapas 1 y 2) |
| 0 | `stable-piece-id` | 15/16 — falta correr el backfill |
| 5 | `ads-model` | 14/17 — 3 tareas escriben en el tablero |
| 7 | `system-map-page` | 8/10 — falta una lectura externa |
| 9 | `unschedule-everything` | 9/11 — el test de interrupción necesita el tablero |
| 11 | `attribution-loop` | 14/16 — falta declarar la operación del enlace |
| 12 | `public-release` | 14/19 — faltan licencia, nombre y remote (D-14) |
| 14 | `notion-deep-links` | 9/12 — verificar el `--apply` necesita acceso |
| 8 | `notion-bridge-contract` | 7/13 — ídem |
| 10 | `move-resilient-keys` | 5/15 — el freno está puesto; reparar necesita las dos cosas de abajo |

## Las dos cosas que desbloquean casi todo

**1. Dejar los vaults quietos y correr el backfill de ids.**

```bash
# commitear o descartar lo pendiente en ~/vaults/brain y ~/vaults/tegu-growth
python3 scripts/backfill-piece-id.py --brand all            # dry-run: 275 ids
python3 scripts/backfill-piece-id.py --brand all --apply
```

Desbloquea `stable-piece-id`, `move-resilient-keys` y el índice de Supabase
(D-15/D-16). Los scripts abortan solos si el vault está sucio, y tienen razón:
el 2026-09-24 se escribieron 14 rutas que estaban muertas minutos después.

**2. Compartir la página Growth con la integración de Notion.**

En Notion: la página **Growth** → `⋯` → **Connections** → conectar `growth-loop`.

Desbloquea `notion-bridge-contract`, `notion-deep-links` y las tres tareas de
`ads-model` que escriben en el tablero. El token ya está configurado y es
válido; lo que falta es el permiso.

## Lo que quedó andando

```bash
npm run dev                      # → /tegu y /personal · 9 vistas por marca
GROWTH_CONSOLE=1 npm run dev     # + /operar y /configuracion
npm run audit                    # read-only: qué ve el parser
npm test                         # 232 de vitest + 27 de Python
```

| | |
|---|---|
| piezas leídas | **129** de Tegu · **154** personales |
| creativos de campañas | **17**, en 2 de 6 buyer personas |
| aislamiento entre marcas | verificado con sondas sobre el build, no deducido |
| build recortado | `GROWTH_SOURCES=tegu` → 0 rutas de la otra marca, 0 apariciones |

## Las siete reglas duras

Están en `config.yaml` y valen para todo change. Las siete salieron de haberlas
roto; la procedencia de cada una está en el `Why` del change que la usa.

1. **Fallar ruidoso, nunca vacío.** Un artefacto que muestra cero cuando no encontró nada parece información.
2. **Sin señal explícita no se infiere.** Se usa el valor conservador y se reporta cuántos cayeron ahí.
3. **Un dueño por campo.** El `.md` manda en el contenido; el tablero, en la coordinación.
4. **Las marcas no se mezclan.** Es privacidad, y la separación es estructural.
5. **Números reales o nada.** La ausencia se representa como ausencia, nunca como cero.
6. **Nada corre solo.** Toda ejecución la dispara una persona que ve el resultado.
7. **Crear es el vault; medir es la plataforma.** Acá no se escribe una pieza.

Las decisiones tomadas —y las que se descartaron, con su motivo— están en
[DECISIONS.md](DECISIONS.md).
