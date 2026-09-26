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
| D-9 | Identificador propio dentro de cada `.md` | **decidida** | 2026-09-26 |
| D-10 | Adapter de LinkedIn | **abierta — bloqueada** | — |
| D-11 | Convergencia de los dos pipelines de contenido de Tegu | **resuelta** | 2026-09-24 |
| D-12 | Deploy compartido con el socio | **abierta** | — |
| D-13 | El proyecto pasa a ser open source | **decidida** | 2026-09-24 |
| D-14 | Nombre definitivo, remote y licencia | **abierta** | — |
| D-15 | Supabase como índice derivado del vault | **decidida — con condiciones** | 2026-09-24 |
| D-16 | Un proyecto de Supabase por marca | **decidida** | 2026-09-26 |

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

## D-9 · Identificador propio dentro de cada `.md` — decidida

Resolvería de raíz el problema de llave de `move-resilient-keys`. Se descartó el
2026-09-24 porque implica escribir en más de 200 archivos del vault para resolver un
problema del otro lado del puente, y contradice la regla de que el dashboard se adapta
al vault. La condición de reapertura que quedó escrita fue: *"que la reconciliación por
evidencia resulte insuficiente en la práctica."*

**Se cumplió el mismo día.** El intento de re-llavear las 57 filas por evidencia
escribió 14 rutas que estaban muertas minutos después, porque otra sesión seguía
reorganizando el vault (ver `move-resilient-keys/tasks.md`, nota del 17:40). El
criterio de emparejamiento funcionó; lo que falló es que **no hay nada estable contra
qué emparejar**: la identidad de una pieza es su ruta, y la ruta cambia.

**Lo que costó no tenerlo.** Una sola reorganización del vault (D-11) dejó 57 filas
huérfanas, invalidó 14 escrituras de reparación, y bloqueó el sync de Tegu con
`--apply` por tiempo indefinido. Escribir un id en ~265 archivos es un pase de script
que corre una vez.

**Lo que la mantiene incómoda.** Sigue contradiciendo *"el dashboard se adapta al
vault, no al revés"*. La contradicción es real y hay que aceptarla explícitamente: un
id no es una normalización de estilo, es la condición para que cualquier cosa afuera
del vault pueda referirse a una pieza sin romperse.

**Bloquea a D-15.** Un índice derivado construido sobre la ruta hereda exactamente el
mismo problema, una capa más abajo.

### La forma que se eligió — 2026-09-26

La decidió Matías. **Ocho caracteres de un alfabeto de 31**, sin los que se
confunden al transcribir a mano o al dictar: sin `0`/`O`, sin `1`/`l`/`i`.

```
alfabeto: 23456789abcdefghjkmnpqrstuvwxyz   (8 dígitos + 23 letras = 31)
ejemplo:  - id: k7m2p9qx
```

31⁸ ≈ 8,5 × 10¹¹ combinaciones. Con las ~265 piezas de hoy la probabilidad de
colisión por azar es del orden de 10⁻⁸: el riesgo real no es el azar, es que
alguien duplique un archivo para partir de él, y eso se resuelve abajo.

**Por qué opaco y no algo legible.** Un id que codifique red, fecha o fórmula
vuelve a envejecer en cuanto la pieza cambia de red o se re-fechea — que es el
mismo defecto que la ruta, disfrazado. El id no dice nada de la pieza a propósito.

**Qué pasa con los repetidos: se reportan y se corta.** No se renumera solo. Si
dos piezas declaran el mismo id, la app nombra las dos rutas y no resuelve
ninguna referencia externa hacia ellas. Elegir una en silencio es exactamente la
clase de decisión que dejó 57 filas apuntando al vault equivocado; y renumerar
automáticamente haría que la app decida sobre la identidad de una pieza, que es
criterio del humano. Coherente con la REGLA DURA 1.

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

## D-15 · Supabase como índice derivado del vault — decidida, con condiciones

Se suma Supabase, con una skill que lo reconstruye desde los `.md` y lo consulta por
su API. **No es la fuente de verdad: es una proyección.** La verdad siguen siendo los
`.md`, y la regla de arriba no se toca.

**Por qué no como fuente de verdad.** Ya se vivió el costo de tener la verdad en dos
lados: Notion como segundo store, y una reorganización del vault lo dejó apuntando al
vacío (D-11). Un Supabase escribible sería la misma trampa con un actor más. Un índice
que se rehace no genera conflictos porque no se reconcilia: se borra y se vuelve a
construir.

**Qué compra que hoy no se puede.** Las preguntas que hoy exigen un script por
pregunta: qué fórmula rinde mejor por red con los cortes reales; qué piezas publicadas
no tienen `url` (al 2026-09-24, **99 de 112** en tegu-growth, medido con un scan del
footer); y sobre todo **comparar el mismo creativo entre sus destinos** — el modelo de
distribuciones de `multi-destination-pieces` hace que un reel tenga N series
comparables entre sí, y un `.md` no se consulta así.

**Sin dependencias nuevas.** PostgREST es REST plano y `scripts/` no tiene
`requirements.txt`: `sync-notion.py:30` ya habla con la API de Notion por
`urllib.request`. Mismo patrón.

### Las cinco condiciones

1. **Un solo sentido.** Nada escribe de Supabase hacia el `.md`. El día que algo lo
   haga, hay dos verdades.
2. **Rebuild completo, nunca incremental.** Borrar y reconstruir tiene que reproducir
   la tabla idéntica. Con ~265 piezas entre los dos vaults tarda segundos, y el sync
   incremental es de donde sale la deriva.
3. **Depende de D-9.** Si la fila se identifica por la ruta, el índice hereda la llave
   rota. **No arrancar antes de que D-9 cierre.**
4. **Se dispara con el ingest, pero reconstruye todo.** Las piezas se crean y se editan
   en Obsidian sin ingest de por medio; un sync que solo toque lo que el ingest tocó
   queda al día en números y viejo en todo lo demás.
5. **Fallar ruidoso (REGLA DURA 1).** Si la lectura del vault vuelve vacía, no escribir
   un Supabase vacío. Es el bug fundacional de este repo, con otro destino.

### Orden de implementación

1. D-9 — id estable en cada `.md`.
2. Validador de footer que corra al guardar. Al 2026-09-24, **0 de 112** piezas de
   tegu-growth cumplen el contrato, y el campo `cuenta:` tenía 13 valores distintos en
   las 33 piezas de Instagram. La evidencia de que el enforcement funciona está al
   lado: el hook `validar-pieza.py` del vault, que exige fuente para cada número, **se
   respeta**. Misma gente, mismo vault; la diferencia es que uno se enforza y el otro no.
3. Recién ahí Supabase.

Hacerlo al revés escribe en Postgres los datos sucios del origen, y se terminan
debuggeando en dos lugares en vez de uno.

### Lo que queda abierto

- **El esquema.** Una tabla por pieza y otra por corte es lo obvio, pero las
  distribuciones (`multi-destination-pieces`) piden una tercera, y eso se define con el
  modelo cerrado, no antes.
- **Dónde corre la skill.** REGLA DURA 6 dice que nada corre solo: la dispara una
  persona. Falta decidir si vive en `scripts/` o en la consola de operaciones
  (`operations-console`).

## D-16 · Un proyecto de Supabase por marca — decidida

**Qué se decidió.** El índice derivado de D-15 vive en **dos** proyectos, uno por
marca, en organizaciones distintas:

| proyecto | org | indexa |
|---|---|---|
| `tegu-growth` | `tegu` | las piezas de Tegu |
| `growth-loop-mativallej` | `matiasvallejos` | las piezas de la marca personal |

**Por qué no uno solo.** La REGLA DURA 4 pide que la separación entre marcas sea
estructural, no un filtro. Un solo proyecto en la org de Tegu con las dos marcas
adentro deja el contenido personal —que incluye la historia del despido— al
alcance de cualquiera con acceso a esa organización: hoy el socio, mañana quien
se sume. Y a diferencia del build, donde `GROWTH_SOURCES` recorta, una API no
tiene ese corte: la única frontera sería un `where` que alguien puede olvidar.

Con dos proyectos la frontera son las credenciales y las orgs. Un leak expone una
marca, no las dos.

**Costo aceptado.** Dos connection strings y dos juegos de claves en `.env.local`.

**Sigue bloqueada por D-9** hasta que el backfill de ids corra: un índice
llaveado por ruta reproduce el problema de `move-resilient-keys` una capa más
abajo. Con D-9 decidida, el desbloqueo es cuestión de correr el backfill.
