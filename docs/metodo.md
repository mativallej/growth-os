# El método y las capas

Cómo se trabaja acá, y dónde vive cada paso.

> Esto vivía en dos vistas de la app (`/mapa` y `/metodo`). Se movió a `docs/`
> porque es **doctrina del proyecto**, no un dato que se mire todos los días: con
> varios vaults la app repetía la misma explicación por marca, y lo que sí cambia
> entre marcas —sus rutas, sus credenciales, sus skills— se ve mejor en la
> pantalla de configuración.

## Las tres capas, un verbo cada una

Si dos capas comparten verbo, una de las dos está de más.

| capa | verbo | qué es |
|---|---|---|
| **Los vaults de Obsidian** | Crear | Archivos `.md` en disco, con sus agentes y sus skills de voz. **Acá está la verdad**: no hay base de datos y no va a haber |
| **El destino de colaboración** | Coordinar | El tablero donde el trabajo se ve moverse. Para el equipo, y para lo que pasa esta semana |
| **Esta plataforma** | Medir | Lee los vaults, prepara operaciones y muestra lo que ninguna de las otras dos puede |

### Lo que NO le corresponde a cada una

Es la mitad que más se olvida, y la que evita resolver en la capa equivocada.

**Los vaults** no coordinan quién hace qué —eso no se ve en una carpeta—, no
miden (un `.md` no cruza un export con una pieza) y no son la interfaz para
alguien que no usa Obsidian.

**El tablero** no es la fuente de verdad de nada que viva en el vault, no guarda
series de métricas, y no puede responder qué fórmula nunca se estrenó: una
fórmula sin usar **no tiene fila en ninguna base**.

**Esta plataforma** no escribe ni edita el cuerpo de una pieza, no duplica el
tablero, y no ejecuta sola.

> La frontera que más se pone a prueba es la primera: **la plataforma no es un
> editor**. La única escritura de contenido que admite es captar una idea, que es
> materia prima. Sin esa frontera esto termina siendo un editor peor que el que
> ya hay.

## Los ocho pasos

De una idea suelta a un aprendizaje escrito.

| # | paso | dónde | qué se rompe si se saltea |
|---|---|---|---|
| 1 | **Captar** | esta app | La idea se pierde. Es el paso más barato y el que más se saltea |
| 2 | **Investigar** | el vault | La pieza afirma cosas que no puede sostener, y eso se nota |
| 3 | **Escribir** | el vault | No hay pieza |
| 4 | **Evaluar** | el vault | Sale algo que no debería. Existe para que la evaluación quede escrita **antes** del resultado, y no se acomode después |
| 5 | **Publicar** | la red | No hay nada que medir |
| 6 | **Coordinar** | el tablero | Dos personas escriben la misma pieza |
| 7 | **Medir** | el vault | La deuda de medición — hoy el agujero más grande del sistema |
| 8 | **Aprender** | el vault | El loop no cierra: se publica mucho y no se aprende nada, que es el estado del que este proyecto existe para salir |

**Esta app entra en dos pasos y en ningún otro**: captar la idea (1) y preparar
la medición (7), más el cruce del paso 8 contra el catálogo. Los demás son el
vault con sus skills, que viven en `.claude/skills/` de cada uno.

Del paso 5 vale aclarar una decisión: **no hay publicador automático** (D-3). Lo
que sí queda es la `url` registrada, que es la llave con la que después se mide.

## Quién manda sobre cada campo

La regla dura 3: nunca escriben los dos lados lo mismo.

| campo | manda | si se toca del otro lado |
|---|---|---|
| cuerpo de la pieza | **vault** | Se pisa en la próxima sincronización. El tablero muestra una copia |
| fórmula · canal · cuenta · formato | **vault** | Se pisa. El footer del `.md` es el que manda |
| url y fecha de publicación | **vault** | Se pisa. Y sin `url` la pieza no se puede medir: es la llave del ingest |
| cortes de métricas | **vault** | Se pisa. Los escribe la ingesta, y el valor vigente es el último corte |
| **estado del kanban** | **coordinación** | Gana el tablero y se escribe de vuelta al `.md` |
| asignación a una persona | **coordinación** | No existe del lado del vault. Nadie la pisa |
| identificador de la pieza | **vault** | Se pisa, y rompe el emparejamiento: es la llave con la que el tablero encuentra su `.md` después de que el archivo se mueva |

**El estado del kanban es el único que viaja en los dos sentidos.** El vault
decide con qué estado *nace* una fila; el tablero manda de ahí en adelante. Sin
esa regla escrita es justo donde se inventa información — y ya pasó: el
2026-09-23 se puso "En producción" en 51 piezas que el vault no marcaba, y la
columna que más importa quedó ilegible.
