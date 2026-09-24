# Proposal

## Why

El sistema tiene tres capas y la división de trabajo entre ellas es la decisión más
importante que se tomó:

- **Los vaults de Obsidian, con sus agentes** — donde se crea y donde está la verdad.
- **El destino de colaboración** — donde se coordina con otra persona.
- **Esta plataforma** — el nexo desde donde se opera y se mira.

Esa división hoy **no está escrita en ningún lado completo.** Vive repartida en los
`Why` de seis changes, en dos `SKILL.md`, en un docstring y en la cabeza de una sola
persona. Se sumó alguien al equipo en septiembre de 2026, y lo primero que necesita
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
