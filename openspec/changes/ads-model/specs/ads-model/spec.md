# Spec Delta

## Purpose

Modelar los creativos de campañas como una entidad distinta de las piezas de
contenido orgánico, organizada por las dimensiones con las que efectivamente se
trabajan, y hacer visible qué combinaciones todavía no tienen creativo.

## ADDED Requirements

### Requirement: Un creativo no es una pieza de contenido

Los creativos de campañas SHALL modelarse como una entidad distinta de las piezas de
contenido orgánico, y MUST NOT participar de las vistas, agregados ni rankings
construidos sobre piezas.

#### Scenario: Vistas orgánicas

- **WHEN** se consulta cualquier vista de contenido orgánico
- **THEN** ningún creativo de campaña aparece en ella

#### Scenario: Indicadores agregados

- **WHEN** se calculan indicadores sobre contenido orgánico
- **THEN** los creativos de campañas no participan del cálculo

### Requirement: El creativo es la unidad de registro

Cada creativo SHALL corresponder a exactamente una entrada. Un creativo MUST NOT
representarse como varias entradas ni agruparse con otros bajo una sola.

#### Scenario: Un creativo, una entrada

- **WHEN** se registra un creativo
- **THEN** existe exactamente una entrada para él
- **AND** su identidad se mantiene entre ejecuciones

### Requirement: Las dimensiones se leen de lo declarado

Las dimensiones de un creativo —buyer persona, dolor, formato, ángulo, ronda y
llamado a la acción— SHALL leerse de lo que el creativo declara. Cuando una dimensión
no esté declarada y la ubicación la identifique, SHALL derivarse de la ubicación
registrando su procedencia. La ubicación MUST NOT prevalecer sobre lo declarado.

#### Scenario: Creativo que declara sus dimensiones

- **WHEN** un creativo declara sus dimensiones
- **THEN** se usan las declaradas

#### Scenario: El creativo se mueve de lugar

- **WHEN** un creativo cambia de ubicación sin cambiar lo que declara
- **THEN** sus dimensiones no cambian

#### Scenario: Dimensión no declarada

- **WHEN** un creativo no declara una dimensión pero su ubicación la identifica
- **THEN** la dimensión se deriva de la ubicación
- **AND** queda registrado que se derivó, para poder distinguirla de una declarada

#### Scenario: Dimensión que no se puede determinar

- **WHEN** un creativo no declara una dimensión y su ubicación no la identifica
- **THEN** esa dimensión queda vacía
- **AND** no se completa con un valor por defecto

### Requirement: Solo los creativos son creativos

Los documentos que acompañan a un creativo —evaluaciones, notas de revisión— MUST NOT
registrarse como creativos.

#### Scenario: Evaluación de un creativo

- **WHEN** existe un documento de evaluación junto a un creativo
- **THEN** no genera una entrada propia
- **AND** el creativo evaluado sigue teniendo exactamente una

### Requirement: El conjunto de personas y dolores no está fijado en el código

Los valores válidos de buyer persona y de dolor SHALL derivarse de la fuente.
Incorporar una persona o un dolor nuevo MUST NOT requerir cambios en el código.

#### Scenario: Se suma una buyer persona

- **WHEN** aparece una buyer persona nueva en la fuente
- **THEN** queda disponible como dimensión sin modificar código

#### Scenario: Dolor fuera del mapa inicial

- **WHEN** un creativo declara un dolor que no estaba previsto
- **THEN** se registra igual y aparece en la cobertura

### Requirement: La cobertura muestra las combinaciones sin creativo

El sistema SHALL presentar qué combinaciones de las dimensiones de campaña tienen
creativo y cuáles no, incluyendo explícitamente las que no tienen ninguno.

#### Scenario: Combinación sin ningún creativo

- **WHEN** una combinación de dimensiones no tiene ningún creativo
- **THEN** aparece igual en la cobertura, con cantidad cero

#### Scenario: Muchas combinaciones vacías

- **WHEN** la mayoría de las combinaciones no tiene creativos
- **THEN** la vista lo presenta como el estado real de la cobertura, no como un error

#### Scenario: Creativo sin ronda

- **WHEN** un creativo no declara ronda
- **THEN** se agrupa como sin ronda
- **AND** no se le asigna ninguna

### Requirement: La ausencia de medición de rendimiento se declara

Mientras no exista un contrato de métricas de campañas, el sistema MUST NOT mostrar
indicadores de rendimiento de creativos, y SHALL indicar explícitamente que el
rendimiento no se está midiendo.

#### Scenario: Vista de campañas sin contrato de métricas

- **WHEN** se consulta la vista de campañas
- **THEN** se indica que el rendimiento no se mide todavía
- **AND** no se muestra ningún indicador de rendimiento

#### Scenario: Un creativo trae números sueltos

- **WHEN** un creativo declara valores numéricos sin un contrato que los defina
- **THEN** no se interpretan como métricas comparables
