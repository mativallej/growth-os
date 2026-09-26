# Design

## Por qué el estado es el único campo bidireccional

| Campo | Manda | Por qué |
|---|---|---|
| Cuerpo, fórmula, url, fecha, cortes | el `.md` | Lo escribe quien crea y quien mide |
| Estado, después de crear la fila | Notion | Es coordinación: lo mueve quien planifica |
| Estado con el que la fila nace | el `.md` | Notion no sabe nada de una pieza que todavía no existe ahí |
| Marca, canal, formato, público, persona, dolor | el `.md` y la ruta | Derivados |
| Cuerpo de un documento | el `.md`, siempre | La vuelta de Notion son los comentarios |

Un campo con dos dueños sin una regla de precedencia es una carrera, y el perdedor
es el que escribió último. La regla de precedencia acá es temporal: **el vault gana
en el nacimiento, Notion gana en la vida.**

## Por qué la documentación va en un solo sentido

Un round-trip markdown ↔ bloques de Notion pierde información en cada viaje. Con
texto que un humano escribió y volverá a editar, eso es corrupción lenta y difícil
de detectar. Entonces el texto tiene un solo dueño, el `.md`, y la colaboración
ocurre en los comentarios, que no son el documento.

## La llave de emparejamiento

Es la **ruta relativa del archivo**, no el título: sobrevive a renombrar la pieza,
que es lo que más pasa. El costo es que sobrevive mal a **mover** el archivo — una
pieza movida de carpeta se ve como una fila nueva. Aceptado por ahora, porque mover
es mucho menos frecuente que renombrar, pero es la deuda conocida de este diseño.

## Qué pasa si la fuente falta

El puente nunca borra. Si una pieza desaparece del vault, su fila en Notion queda y
se reporta como huérfana. Es deliberado: el borrado silencioso de trabajo ajeno es
peor que un residuo visible, sobre todo con otra persona operando el tablero.
