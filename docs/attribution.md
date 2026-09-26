# Atribución

Cómo se conecta una pieza publicada con lo que pasa **después** de la red social.

Es el único hueco que el research señala y que este sistema no tiene. Todo lo que
se mide hoy —impresiones, alcance, profile visits, follows, saves, shares— se
detiene en el borde de la red. Y eso pesa más acá que en casi cualquier otro
proyecto, porque **Tegu monetiza por lead entregado**: la métrica que decide si
el growth funciona está río abajo de todo lo medido.

Un hilo con 32.982 impresiones y 600 profile visits es el mejor dato que hay, y
no se sabe si trajo un solo usuario.

## La convención del enlace

```
<destino>?utm_source=<red>&utm_medium=<organico|ads>&utm_campaign=<marca>&utm_content=<id de pieza>
```

`utm_content` es **el identificador de la pieza**, y es lo único que hace que el
dato sirva. El research lo dice en una línea:

> *`utm_content` tiene que ser único por post; si no, el dato identifica a
> LinkedIn como canal pero no puede identificar qué post del founder trajo el
> registro.*

| parámetro | de dónde sale |
|---|---|
| `utm_source` | el canal normalizado de la pieza (`x`, `instagram`, `linkedin`, `blog`) |
| `utm_medium` | `organico` para una pieza, `ads` para un creativo |
| `utm_campaign` | la marca |
| `utm_content` | **el `id` del footer** (D-9). Sin `id`, el slug como respaldo |

### Por qué el `id` y no el slug

El slug sale de la ruta, y la ruta cambia: una reorganización del vault ya dejó
57 filas apuntando al vacío. Un enlace rastreable **ya publicado** no se puede
corregir — vive en un tweet de hace ocho meses. Si su `utm_content` deja de
corresponder con la pieza, el dato no se rompe: **miente**, y apunta a otra.

El `id` del footer se asigna una vez y no cambia nunca. Es la única llave que
aguanta estar impresa en algo que ya salió.

### Dónde vive el enlace en la pieza

En el campo **`url`** que el contrato ya tiene, cuando el destino es propio. **No
se inventa una clave nueva**: el footer ya distingue la url del post publicado de
los destinos que la pieza empuja, y agregar `utm_url` crearía un tercer lugar
donde buscar la misma cosa.

El enlace rastreable se **genera al publicar** y no se persiste: es derivable del
`id`, la red y la marca, y persistir una derivada es exactamente lo que el
contrato de footer prohíbe.

## Las tres señales, que nunca se colapsan en un número

| señal | qué ve | qué NO ve |
|---|---|---|
| **Atribuida por clic** | quién llegó por un enlace rastreado | lo que se comparte por privado, y todo Instagram fuera de bio |
| **Auto-reportada** | el campo abierto de "¿cómo nos conociste?" | lo que la gente no recuerda |
| **Serie temporal** | registros y tráfico directo durante períodos de publicación sostenida | cualquier otra causa que haya pasado el mismo mes |

**Las discrepancias entre las tres son información, no errores.** Si el clic dice
3 y el auto-reportado dice 20, eso significa que 17 personas llegaron por un
camino que el clic no ve — que es exactamente el dato que hace falta.

Se muestran separadas y **ninguna se presenta sola**. Una sola parece la verdad.

## El caso Instagram

Instagram **no permite un enlace clickeable en el cuerpo de un post**: va en bio
o en story. Es el canal donde más clic se pierde, y su atribución por clic va a
subestimar sistemáticamente.

Consecuencia aceptada: en Instagram, la señal auto-reportada no es un complemento
sino la principal.

## Lo que NO afirma este sistema

Ningún umbral, ningún objetivo de conversión, **ninguna afirmación de causalidad**.
El sistema junta la evidencia y la muestra separada. Qué significa lo decide una
persona.

Y la distinción que más fácil se rompe y más caro sale:

> **"No se está midiendo" NO ES "cero conversiones".**

Un cero en una vista de atribución, cuando en realidad el circuito está abierto,
es la clase de número que hace cancelar un canal que funcionaba.

## Lo que falta del otro lado — no es de este repo

Para que la señal de clic exista, **el producto** tiene que:

1. **Persistir el primer toque y el último toque por separado**, y no pisarlos.
   Son dos preguntas distintas: qué lo trajo y qué lo convenció.
2. **Emitirlos junto con el registro**, para que el lead quede pegado a su origen.
3. **Un campo abierto y opcional de "¿cómo nos conociste?"** en el post-registro.

El tercero es **lo más barato de toda la lista y lo único que ve el boca a boca**
— el WhatsApp, que en Argentina es probablemente la mitad del descubrimiento real
y hoy es completamente invisible.

**Mientras eso no exista, la vista dice que el circuito está abierto. No muestra
ceros.**
