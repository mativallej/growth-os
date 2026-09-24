# Design

## El identificador ya existe

La tentación sería generar un identificador de campaña nuevo. Sería un error: crearía
un segundo espacio de nombres que alguien tiene que mantener alineado con el primero,
y ya sabemos cómo termina eso — el puente con el destino de colaboración se rompió
justamente por una llave que no sobrevivió a una mudanza.

El slug de la pieza es único (268 sobre 268, verificado), estable por regla dura, y
ya es la llave pública de la pieza en este sistema. Reusarlo significa que el enlace
rastreado y la fila del tablero y la página de la pieza hablan del mismo objeto sin
traducción.

## Por qué tres señales y no un número

Las tres miden cosas distintas y ninguna es "la verdad":

| Señal | Qué ve | Qué no ve |
|---|---|---|
| Clic | quién llegó por un enlace rastreado | lo compartido por privado, el que buscó la marca después |
| Auto-reportada | influencia memorable, incluido el boca a boca | lo que el usuario no recuerda o no asocia |
| Serie temporal | movimiento agregado durante períodos de publicación | cualquier otra cosa que pasó en el mismo período |

Colapsarlas en un porcentaje único produce un número que parece preciso y no lo es.
El research es explícito: *"reportar primer y último toque junto con la auto-reportada;
las discrepancias son información, no errores."*

## Lo que el sistema no va a afirmar

No hay volumen para modelado de mezcla de medios ni para pruebas de incrementalidad,
y no lo va a haber pronto. Entonces el sistema **no dice que una pieza causó un
registro.** Dice que un registro llegó por el enlace de esa pieza, o que alguien
escribió su nombre en un campo, o que en las semanas en que se publicó sostenido
pasaron más cosas. Tres hechos, sin pegamento causal.

Esto no es humildad decorativa: es la diferencia entre una herramienta que ayuda a
decidir y una que fabrica confianza.

## Qué falta del otro lado del puente

Este change no puede entregar atribución solo. Del lado del producto hace falta:

- Persistir primer y último toque en el primer landing, en almacenamiento de primera parte.
- Emitirlos junto con el registro y con los eventos de marketplace que importan.
- El campo abierto y opcional de "¿cómo nos conociste?", guardando la respuesta cruda **y** una categoría normalizada.

Se declara acá para que quede explícito que generar enlaces **no alcanza**, y que
mientras eso no exista el circuito está abierto y el sistema tiene que decirlo en vez
de mostrar ceros.

## Qué pasa si la fuente falta

Si no hay datos de conversión, la vista **no muestra cero**: muestra que no se está
midiendo. Un cero de conversiones y una ausencia de medición se ven igual en un
gráfico y significan lo contrario. Es la regla dura de números reales o nada, aplicada
al caso donde más caro sale confundirse.
