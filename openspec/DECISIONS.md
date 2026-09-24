# Decisiones

Lo que se decidió y lo que sigue abierto. Una decisión descartada también se escribe:
si no queda el motivo, dentro de tres meses alguien la vuelve a proponer y hay que
reconstruir el razonamiento desde cero.

| # | Decisión | Estado | Fecha |
|---|---|---|---|
| D-1 | Nada corre solo: toda operación la dispara una persona | **decidida** | 2026-09-24 |
| D-2 | n8n u otro orquestador externo | **descartada** | 2026-09-24 |
| D-3 | Publicador externo tipo Buffer | **descartada por ahora** | 2026-09-24 |
| D-4 | Agente agendado en la nube | **descartada** | 2026-09-24 |
| D-5 | Credencial de servicio de Notion | **diferida** | 2026-09-24 |
| D-6 | La unidad de medición de ads es el creativo | **decidida** | 2026-09-24 |
| D-7 | `spend` de ads: acumulado o por ventana | **abierta** | — |
| D-8 | `nonfoll`: derivada prohibida o excepción documentada | **abierta — la decide Matías** | — |
| D-9 | Identificador propio dentro de cada `.md` | **descartada por ahora** | 2026-09-24 |
| D-10 | Adapter de LinkedIn | **abierta — bloqueada** | — |
| D-11 | Convergencia de los dos pipelines de contenido de Tegu | **resuelta** | 2026-09-24 |
| D-12 | Deploy compartido con el socio | **abierta** | — |
| D-13 | El proyecto pasa a ser open source | **decidida** | 2026-09-24 |
| D-14 | Nombre definitivo, remote y licencia | **abierta** | — |

---

## D-2 · n8n u otro orquestador externo — descartada

**Qué se propuso.** Sacar los trabajos agendados de la Mac y moverlos a n8n, que es
además lo que recomienda el research (*"n8n como orquestador externo para schedules,
Slack, llamadas a analytics y APIs"*).

**Por qué no.** Ninguna de las variantes resuelve el problema real:

| | Corre sin la Mac | Ve el vault | Avisa si falla |
|---|---|---|---|
| n8n en la nube | sí | **no** — el vault son archivos locales | sí |
| n8n self-hosted en la Mac | no | sí | sí |

En la nube no puede leer los vaults. Self-hosted es launchd con un contenedor encima:
misma dependencia de que la máquina esté prendida, más superficie que mantener. Y
ninguna toca el defecto de fondo, que no era el silencio sino que **estas operaciones
no deberían decidirse solas**.

**Qué la reabriría.** Que la fuente de verdad deje de ser el disco.

## D-3 · Publicador externo tipo Buffer — descartada por ahora

**Qué se propuso.** El research recomienda *"Buffer o un publicador aprobado para la
primera versión de producción, en vez de mantener tres integraciones sociales"*.

**Por qué no.** Choca de frente con D-1: un publicador es, por definición,
publicación agendada. Y publicar es el momento donde más conviene mirar — es el punto
sin retorno de todo el pipeline. El research se contradice a sí mismo acá: su propia
conclusión dice que *"los casos creíbles preservan la aprobación humana en los límites
editorial y de publicación"*.

**El costo aceptado.** Publicar a mano en tres redes. Es trabajo real y repetitivo.

**Qué la reabriría.** Que el volumen haga inviable publicar a mano, o que aparezca un
publicador con aprobación explícita por pieza en vez de programación por calendario.

## D-4 · Agente agendado en la nube — descartada

**Qué se propuso.** Una routine de Claude en la nube, que resolvería la credencial
porque hablaría con Notion por MCP.

**Por qué no.** Ve el repositorio, no el disco. Medido el 2026-09-24: el vault
personal tenía **11 commits sin pushear** más una pieza sin commitear. Una routine
calcularía la cadencia sin ver la pieza que se acababa de grabar, que es exactamente
lo que el digest tiene que mirar.

**Qué la reabriría.** Mover el análisis a que lea el tablero en vez del vault — que
es lo que propone `scheduling`... perdón, lo que quedó escrito en
`unschedule-everything`. Con el tablero como fuente, una routine en la nube vuelve a
ser viable para la parte de análisis.

## D-5 · Credencial de servicio de Notion — diferida

Con D-1 vigente, ninguna operación corre sin sesión, y una sesión ya está
autenticada por MCP. La credencial deja de ser necesaria para el camino normal.

**Sigue haciendo falta si:** se quiere correr los scripts sin sesión de agente, o si
la captura de ideas pasa a escribir directo al destino en vez de encolar local.

## D-6 · La unidad de medición de ads es el creativo — decidida

Una fila por creativo. Coherente con el framework propio: *"el creativo ES el
targeting"*.

**Se queda corta si** un mismo creativo llega a correr en varios públicos a la vez.
Ahí hay que pasar a creativo × público, y es una migración de esquema, no un ajuste.

## D-7 · `spend` de ads: acumulado o por ventana — abierta

El contrato general dice que el valor vigente es el último corte, lo que supone
acumulado. Para gasto eso funciona **solo si siempre se exporta de por vida**. Meta
entrega las dos cosas según cómo se pida el reporte, y un acumulado y una ventana se
ven idénticos en el footer.

**Se responde con el primer export real, no antes.**

## D-8 · `nonfoll` — abierta, la decide Matías

Anotada por él en `tegu-growth/Analytics/Contrato de Footer.md`: es una derivada y el
contrato prohíbe escribir derivadas, pero `growth-analytics` y `src/lib/types.ts` la
usan hoy. Opciones: guardar los crudos y calcularla, o aceptarla como excepción
documentada. **Hasta que se decida, no se escribe.**

## D-9 · Identificador propio dentro de cada `.md` — descartada por ahora

Resolvería de raíz el problema de llave de `move-resilient-keys`. Se descarta porque
implica escribir en más de 200 archivos del vault para resolver un problema del otro
lado del puente, y contradice la regla de que el dashboard se adapta al vault.

**Qué la reabriría.** Que la reconciliación por evidencia resulte insuficiente en la
práctica.

## D-10 · Adapter de LinkedIn — abierta, bloqueada

`config/networks.json` lo marca `pendiente — falta un export real de LinkedIn
Analytics`. No se escribe sin ver un export: mapear columnas de memoria es inventar.

**Peso del bloqueo:** al 2026-09-24 el digest reporta *"LinkedIn: nunca se exportó"*,
y es el canal con más días sin pieza.

## D-11 · Convergencia de los dos pipelines de Tegu — resuelta

Convivían `Brand/Content/Create` (propio) y `Create/` (de Rocco, contractor externo).
Se fusionaron el 2026-09-24 en `Create/Organic` y `Create/Ads` (commit `ba96059`).

**Costo que dejó:** rompió la llave de emparejamiento de 57 filas del tablero. Ver
`move-resilient-keys`.

## D-12 · Deploy compartido con el socio — abierta

Dos proyectos desde el mismo repo, diferenciados solo por qué fuentes entran al
build, de modo que el deploy compartido **no contenga** el contenido personal en vez
de ocultarlo.

**Bloqueada por** `account-scoped-routes`. Y hay una trampa a verificar antes: en el
tier gratis del hosting, la protección por autenticación restringe al dueño de la
cuenta y no admite miembros de equipo — el socio no podría entrar.

## D-13 · El proyecto pasa a ser open source — decidida

**Qué cambia.** Ver `public-release`. Lo verificado: no hay secretos en el historial,
así que no hay que reescribirlo.

**Lo que requiere criterio, y no es lo obvio.** El OpenSpec de este repo vale
justamente por lo específico que es: las reglas convencen porque traen la cicatriz de
haberlas roto. Sanearlo con miedo lo convierte en once documentos de generalidades.
El criterio es **sale quién, se queda qué pasó**: los terceros se describen por su
rol, la información sensible por su función, y el mecanismo del fallo se conserva
entero.

**Consecuencia que conviene asumir de entrada.** Publicar una herramienta que opera
sobre archivos locales de otra gente convierte los recaudos que ya existen —dry-run
por defecto, nunca borrar, fallar si falta una raíz— en responsabilidad hacia
terceros. Hay que decirlos en el README, no dejarlos en el código.

## D-14 · Nombre definitivo, remote y licencia — abierta

Hoy el directorio se llama `growth-loop-obsidian`, `package.json` dice `tegu-growth`
y el remote apunta a un repositorio de la organización de la empresa. Los tres tienen
que converger, y la elección es del autor.

La licencia también: el proyecto opera sobre archivos personales de quien lo use, lo
que hace que la cláusula de ausencia de garantía sea más relevante que en una
librería cualquiera.
