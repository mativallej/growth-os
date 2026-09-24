# OpenSpec — growth-loop

Seis changes abiertos al 2026-09-24. **Uno por vez**, nunca en paralelo: cada uno se
implementa, se cierra, se limpia el contexto, y recién ahí arranca el siguiente.

## El orden, y por qué

Los cuatro primeros son una cadena: cada uno necesita al anterior.

| # | Change | Qué desbloquea |
|---|---|---|
| 1 | `fail-loud-sources` | Hoy el dashboard buildea vacío y no avisa. Nada de lo que sigue se puede verificar sobre un array vacío |
| 2 | `footer-contract-parser` | El parser lee un contrato que ya no se escribe, y descarta piezas en silencio |
| 3 | `account-scoped-routes` | Sin esto, el contenido personal viaja dentro de las vistas de Tegu. **Hasta que cierre, ningún build se comparte** |
| 4 | `growth-views` | Recién acá el repo entrega algo que Notion no puede dar |

Los dos últimos son independientes de la app y se pueden tomar en cualquier momento:

| # | Change | Estado |
|---|---|---|
| 5 | `notion-bridge-contract` | El puente ya existe y funciona a mano. Falta la credencial y faltan los tests |
| 6 | `scheduling-and-alerts` | Los dos trabajos agendados fallan mudos. La tarea 1 se puede hacer hoy, sin credenciales |

**Si hay que elegir uno solo para empezar:** la tarea 1 de `scheduling-and-alerts`.
Es la única que arregla algo que está roto ahora mismo, no cuesta credenciales y
evita que el próximo fallo también pase inadvertido.

## Las reglas duras

Están en `config.yaml` y valen para todo change. Las cinco, en una línea cada una:

1. **Fallar ruidoso, nunca vacío.** Un artefacto que muestra cero cuando no encontró nada parece información.
2. **Sin señal explícita no se infiere.** Derivar un campo desde datos que no lo contienen usa el valor conservador y reporta cuántos cayeron ahí.
3. **Un dueño por campo.** El `.md` manda en el contenido; el tablero, en la coordinación.
4. **Las dos cuentas no se mezclan.** Es privacidad, y la separación es estructural.
5. **Números reales o nada.** La ausencia de un dato se representa como ausencia, nunca como cero.

Las cinco salieron de haberlas roto. La procedencia de cada una está en el `Why` del
change que la usa.
