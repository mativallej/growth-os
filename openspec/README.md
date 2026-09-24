# OpenSpec — growth-loop

Nueve changes abiertos al 2026-09-24. **Uno por vez**, nunca en paralelo.

## Qué es esto

La capa de operación y medición del growth de dos marcas que no se fusionan. Tres
capas, y la división entre ellas es la decisión de fondo:

```
vaults de Obsidian + agentes   →   operación CREATIVA. La verdad vive acá
Notion                         →   COORDINACIÓN con el equipo
growth-loop                    →   operación de GROWTH: captar, sincronizar,
                                   exportar, ingerir, medir
```

**Nada corre solo.** Toda operación la dispara una persona desde la consola: la app
prepara, una sesión local ejecuta, la persona aprueba.

## El orden

Los cuatro primeros son una cadena: cada uno necesita al anterior.

| # | Change | Qué desbloquea |
|---|---|---|
| 1 | `fail-loud-sources` | Hoy el dashboard buildea vacío y no avisa. Nada se puede verificar sobre un array vacío |
| 2 | `footer-contract-parser` | El parser lee un contrato que ya no se escribe, y descarta piezas en silencio |
| 3 | `account-scoped-routes` | Sin esto, el contenido personal viaja dentro de las vistas de Tegu. **Hasta que cierre, ningún build se comparte** |
| 4 | `growth-views` | Recién acá el repo entrega algo que Notion no puede dar |

Después, sobre esa base:

| # | Change | Depende de |
|---|---|---|
| 5 | `ads-model` | 2 — un creativo no es una pieza: persona × dolor × ángulo × ronda, y la cobertura |
| 6 | `operations-console` | 3 y 9 — el catálogo de operaciones con botones y la entrega a sesión local |
| 7 | `system-map-page` | nada duro — la pestaña que explica qué se hace dónde |

Y dos independientes de la app, que se pueden tomar en cualquier momento:

| # | Change | Estado |
|---|---|---|
| 8 | `notion-bridge-contract` | El puente existe y funciona a mano. Faltan los tests |
| 9 | `unschedule-everything` | Apagar los dos trabajos agendados. **La tarea 1 se puede hacer hoy** |

**Si hay que elegir uno para empezar:** la tarea 1 de `unschedule-everything` (apagar
lo que hoy corre solo y falla mudo) o la tarea 1 de `ads-model` (arreglar las cuatro
buyer personas faltantes y la lectura por ruta). Las dos arreglan algo que está mal
ahora mismo, ninguna depende de nada.

## Las reglas duras

Están en `config.yaml` y valen para todo change:

1. **Fallar ruidoso, nunca vacío.** Un artefacto que muestra cero cuando no encontró nada parece información.
2. **Sin señal explícita no se infiere.** Derivar un campo desde datos que no lo contienen usa el valor conservador y reporta cuántos cayeron ahí.
3. **Un dueño por campo.** El `.md` manda en el contenido; Notion, en la coordinación.
4. **Las dos cuentas no se mezclan.** Es privacidad, y la separación es estructural.
5. **Números reales o nada.** La ausencia de un dato se representa como ausencia, nunca como cero.
6. **Nada corre solo.** Toda ejecución la dispara una persona, que ve el resultado en el momento.
7. **La operación creativa es Obsidian; la de growth es la plataforma.** Acá no se escribe una pieza.

Las seis salieron de haberlas roto. La procedencia de cada una está en el `Why` del
change que la usa.
