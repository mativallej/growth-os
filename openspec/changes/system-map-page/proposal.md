# Proposal

## Why

El sistema tiene tres capas y la división de trabajo entre ellas es la decisión más
importante que se tomó:

- **Los vaults de Obsidian, con sus agentes** — la **operación creativa**: escribir la pieza, el brief, el guion. Y donde está la verdad.
- **El destino de colaboración** — la **coordinación**: qué está en qué carril, con quién.
- **Esta plataforma** — la **operación de growth**: captar, sincronizar, exportar, ingerir, medir.

Un verbo por capa, y ninguno se solapa. La frontera que más se pone a prueba es la
primera: la plataforma no es un editor, y la única escritura de contenido que admite
es captar una idea, que es materia prima y no trabajo creativo.

Esa división hoy **no está escrita en ningún lado completo.** Vive repartida en los
`Why` de seis changes, en dos `SKILL.md`, en un docstring y en la cabeza de una sola
persona. El equipo dejó de ser una sola, y lo primero que necesita quien entra
es entender qué se hace dónde — no la lista de features de cada capa.

El síntoma de que falta: en las últimas dos semanas se intentó tres veces resolver
en la capa equivocada. El kanban vivió en el vault hasta que se mudó. Las ideas
siguieron vigiladas por un script cuando ya estaban en el destino. Y la primera
versión de la automatización intentó agendar en la nube trabajos que leen archivos
locales.

## What Changes

- Una pestaña que muestra las tres capas, **qué manda en cada campo**, y qué hace y qué **no** hace cada una.
- El mapa se construye desde la configuración, no a mano: las marcas, sus raíces, sus alcances de sincronización y las operaciones disponibles se leen de donde ya están declaradas.
- La parte que sí es prosa —el porqué de la división— se mantiene corta y en un solo lugar.

## Capabilities

### New Capabilities

- `system-map`: la explicación del flujo entre las tres capas, con la garantía de que lo verificable se deriva de la configuración y no puede desactualizarse en silencio.

### Modified Capabilities

*(ninguna)*

## Impact

**Código.** Una vista nueva · un derivador que lee la configuración de fuentes y el catálogo de operaciones.

**Dependencias.** Lo que puede derivar hoy depende de qué changes estén cerrados: las fuentes salen de `content-sources`, las operaciones de `operations-console`. **Se puede escribir antes, con menos derivado y más prosa**, y enriquecerse después.

**Riesgo.** Un diagrama escrito a mano se desactualiza y después miente con autoridad, que es peor que no tenerlo. Por eso el requisito central de este change no es que el mapa sea lindo: es que **no pueda mentir sobre lo verificable**.

**Alcance.** Es contenido explicativo del sistema, no de una marca. No muestra piezas ni creativos, así que no toca la frontera de privacidad.
