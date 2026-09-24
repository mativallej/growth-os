# Proposal

## Why

Cada métrica que este sistema mide se detiene en el borde de la red social:
impresiones, alcance, profile visits, follows, saves, shares. **Ninguna conecta una
pieza con un registro en la app ni con un lead.**

Eso importa más acá que en casi cualquier otro proyecto, porque **Tegu monetiza por
lead entregado**. La métrica que decide si el growth funciona está río abajo de todo
lo que hoy se mide. Un hilo con 32.982 impresiones y 600 profile visits es el mejor
dato que tenemos, y no sabemos si trajo un solo usuario.

El research lo dice en una línea que ordena el problema: *"`utm_content` tiene que
ser único por post; si no, el dato identifica a LinkedIn como canal pero no puede
identificar qué post del founder trajo el registro."*

Y trae una advertencia de secuencia que este proyecto ya incumplió: *"agregar
análisis semanal solo después de que los post IDs, los tags de campaña y los eventos
de conversión se capturen de forma confiable."* **El digest se construyó primero.**
Por eso hoy solo puede hablar de cadencia y alcance: estructuralmente no puede decir
nada sobre crecimiento.

Lo bueno es que **la llave ya existe.** El identificador único y estable por pieza
—el slug— está construido, verificado (268 únicos sobre 268 archivos) y protegido por
una regla que prohíbe tocarlo. Es el `utm_content`, sin trabajo adicional.

## What Changes

- **Un enlace rastreable por pieza**, derivado del identificador que la pieza ya tiene. Se genera como operación de la consola: "dame el link de esta pieza".
- **El enlace queda en la pieza**, para que después se pueda cruzar sin adivinar.
- **Tres señales que nunca se colapsan en un número**:
  - **Atribuida por clic** — quién llegó por un enlace rastreado. Confiable para el clic conocido, ciega a lo que se comparte por privado.
  - **Auto-reportada** — un campo abierto y opcional de "¿cómo nos conociste?". Recupera lo que el clic no ve, con sesgo de recuerdo.
  - **Serie temporal** — registros, búsqueda de marca y tráfico directo durante los períodos de publicación sostenida. Direccional, nada más.
- **Primer toque y último toque se guardan por separado** y nunca se pisan. Las discrepancias entre las tres vistas son información, no errores.
- **Una pieza publicada sin enlace rastreable se reporta como no atribuible**, igual que hoy se reporta la deuda de medición.

**No incluye, y es deliberado:** ningún umbral, ningún objetivo de conversión, ninguna
afirmación de causalidad. El sistema junta la evidencia y la muestra separada; qué
significa lo decide una persona. Es la misma regla que el contrato de footer ya aplica
a los ads: *"el que decide qué es caro o barato es Matías, no la fórmula."*

## Capabilities

### New Capabilities

- `attribution`: cómo se conecta una pieza publicada con lo que pasa después fuera de la red social, qué señales se mantienen separadas, y qué el sistema no afirma.

### Modified Capabilities

- `growth-views`: la deuda de medición gana una dimensión — publicada, medida, pero no atribuible.
- `operations`: aparece la operación de generar el enlace rastreable de una pieza.

## Impact

**Código.** `src/lib/attribution.ts` (nuevo) · una operación en el catálogo · la vista de deuda suma el estado "no atribuible".

**Fuera de este repo — la parte que no controla esta app.** El enlace no sirve solo: alguien tiene que persistir primer y último toque en el landing y emitirlos con el registro. Eso vive en el producto, no acá. **Este change entrega la mitad de arriba del puente y declara explícitamente qué falta del otro lado**, para que no parezca que con generar links alcanza.

**Alcance de marca.** Aplica a las dos, pero el valor es asimétrico: para Tegu cierra el circuito hasta el lead; para la marca personal llega hasta el registro o el contacto, que es lo que hay.

**Riesgo.** El más grande es interpretativo: cuando aparezca el primer número de conversión atribuida, va a ser bajo, porque la mayor parte del descubrimiento pasa por WhatsApp y boca a boca. **Si esa cifra se lee como "el contenido no sirve" en vez de "el clic no ve lo que pasa en privado", el sistema habrá empeorado la decisión en vez de mejorarla.** Por eso las tres vistas van juntas desde el día uno y ninguna se presenta sola.

**Lo más barato de todo, y no es de la plataforma:** el campo abierto de "¿cómo nos conociste?" en el post-registro. Es la única señal que captura el WhatsApp, que en Argentina es probablemente la mitad del descubrimiento real y hoy es completamente invisible.
