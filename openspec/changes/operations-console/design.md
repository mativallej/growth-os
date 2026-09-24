# Design

## Por qué la app no ejecuta lo que escribe

Sería más simple que el botón corriera el script. Se descarta por dos razones
distintas, y cada una alcanzaría sola.

**La de seguridad.** Un endpoint que ejecuta procesos locales con parámetros de la
interfaz es ejecución remota de código en cuanto el build se comparta o el puerto
quede expuesto. Se puede mitigar con validación y gating, pero la mitigación tiene
que ser perfecta todas las veces; delegar la ejecución elimina la clase entera de
problema.

**La de criterio, que importa más.** Las operaciones que escriben necesitan que
alguien mire antes de aplicar: qué piezas se crean, qué estados vuelven al vault,
qué documentos se pisan. Los scripts ya lo hacen bien —previsualizan por defecto—
pero esa previsualización necesita un lector. Un botón que aplica directo convierte
una revisión en un clic, que es exactamente cómo se cargaron 51 piezas con el estado
equivocado el 2026-09-23.

Entonces: **la app prepara, la sesión ejecuta, la persona aprueba.**

## Qué es una "entrega a sesión local"

La app abre una sesión de agente en la máquina, en el directorio correcto, con la
operación ya explicada: qué se pidió, con qué filtros, qué script la implementa y
qué revisar antes de aplicar. Lo que la persona recibe no es una terminal en blanco:
es la operación planteada, lista para revisar y aprobar.

El mecanismo concreto es un detalle de implementación y se resuelve en las tareas. Lo
que el spec fija es la garantía: **la app no aplica; entrega con contexto
suficiente.**

## El catálogo declarativo

Una operación declara: identificador, nombre, qué hace en una línea, parámetros
aceptados, precondiciones, forma de ejecución, y cada cuánto se espera que corra
(solo para mostrar antigüedad, no para agendar nada).

Las precondiciones son la parte que se suele omitir y la que más molesta cuando
falta: si un export de Meta no existe, el botón tiene que decirlo **antes**, no
fallar a mitad de la ejecución. El mismo criterio que el resto del proyecto —fallar
ruidoso— pero corrido hacia adelante: avisar antes de empezar.

## Ads y orgánico como filtro de primer orden

El filtro de ads / orgánico / ambos no es una faceta más: son dos formas de medir
distintas, y ya están separadas en el destino de colaboración y en la estructura de
carpetas. Ponerlo al mismo nivel que "canal" sería sugerir que un ad es un canal más,
que es justo el error que este proyecto viene corrigiendo. Va como dimensión propia,
y su valor por defecto es explícito, nunca "todos" por omisión.

## Qué pasa si la fuente falta

Cubierto por `content-sources`: la consola no carga si una raíz declarada no existe.
Las precondiciones de cada operación cubren el caso más fino —un export que no está,
una credencial que falta— y se evalúan al mostrar el catálogo, no al ejecutar.
