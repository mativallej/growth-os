# Spec Delta

## Purpose

Explicar en un solo lugar cómo se divide el trabajo entre las capas del sistema, de
forma que alguien que se suma entienda qué se hace dónde, y que la explicación no
pueda quedar desactualizada respecto de la configuración real.

## ADDED Requirements

### Requirement: El mapa muestra las capas y la división de trabajo

El sistema SHALL presentar una vista que describa sus capas, qué actividad
corresponde a cada una, y en qué dirección se mueve la información entre ellas.

#### Scenario: Alguien se suma al equipo

- **WHEN** una persona consulta el mapa sin conocer el sistema
- **THEN** puede identificar en qué capa se crea, en cuál se coordina y en cuál se opera

### Requirement: El mapa declara el dueño de cada campo compartido

Para cada campo que exista en más de una capa, el mapa SHALL indicar cuál manda.

#### Scenario: Campo presente en dos capas

- **WHEN** se consulta un campo que vive en más de una capa
- **THEN** el mapa indica cuál es la autoridad
- **AND** indica qué pasa si se modifica en la otra

### Requirement: Lo verificable se deriva de la configuración

Toda afirmación del mapa sobre qué fuentes existen, qué alcances sincroniza cada una
y qué operaciones están disponibles SHALL derivarse de la configuración vigente.
Estas afirmaciones MUST NOT estar escritas de forma fija en la vista.

#### Scenario: Se agrega una fuente

- **WHEN** se agrega una fuente a la configuración
- **THEN** aparece en el mapa sin modificar la vista

#### Scenario: Cambia el alcance de una fuente

- **WHEN** una fuente deja de publicar cierto tipo de contenido
- **THEN** el mapa lo refleja

#### Scenario: Se agrega una operación

- **WHEN** se declara una operación nueva
- **THEN** el mapa la muestra en la capa que la ejecuta

### Requirement: El mapa dice qué no hace cada capa

Para cada capa, el mapa SHALL indicar explícitamente qué actividades no le
corresponden.

#### Scenario: Consulta sobre dónde resolver algo

- **WHEN** una persona busca dónde realizar una actividad
- **THEN** el mapa permite descartar las capas a las que no corresponde

### Requirement: El mapa no expone contenido

La vista del mapa MUST NOT incluir contenido de piezas ni de creativos de ninguna
marca.

#### Scenario: Inspección del mapa

- **WHEN** se consulta el mapa
- **THEN** no contiene texto de ninguna pieza ni creativo
