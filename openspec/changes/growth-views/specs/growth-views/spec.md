# Spec Delta

## Purpose

Ofrecer los análisis que el tablero operativo no puede dar —cadencia contra un
objetivo, deuda de medición, cobertura del catálogo de fórmulas y ranking por
alcance— de forma que los datos faltantes se lean como hallazgo y no como falla.

## ADDED Requirements

### Requirement: La cadencia se muestra contra un objetivo declarado

El sistema SHALL presentar el volumen de publicación por período contra el objetivo
declarado para ese período, y SHALL informar por separado cuántas piezas no pudieron
ubicarse en el tiempo.

#### Scenario: Un período por debajo del objetivo

- **WHEN** un período tiene menos piezas que el mínimo del objetivo
- **THEN** la diferencia respecto del mínimo se muestra explícitamente

#### Scenario: Muchas piezas sin fecha

- **WHEN** una parte sustancial de las piezas de una marca no tiene fecha
- **THEN** la cantidad sin fecha se muestra junto al gráfico
- **AND** esas piezas no se reparten entre períodos

### Requirement: La deuda de medición es una vista de primer orden

El sistema SHALL listar las piezas publicadas que no tienen ninguna métrica medida,
ordenadas por antigüedad desde su publicación, distinguiendo las que declaran la
medición como pendiente de las que no tienen footer.

#### Scenario: Pieza publicada hace tiempo y sin medir

- **WHEN** una pieza está publicada y no tiene ningún corte medido
- **THEN** aparece en la deuda con los días transcurridos desde su publicación

#### Scenario: Una marca con casi todo sin medir

- **WHEN** la mayoría de las piezas de una marca no tienen métricas
- **THEN** la vista lo presenta como el estado real de esa marca, no como un error de carga

#### Scenario: Publicada sin enlace

- **WHEN** una pieza está publicada y no tiene enlace al post
- **THEN** se señala que no puede medirse hasta tener enlace

### Requirement: El catálogo de fórmulas se cruza completo

El sistema SHALL mostrar el uso de cada fórmula del catálogo, **incluidas las que no
tienen ninguna pieza**. Las piezas que no puedan clasificarse SHALL agruparse en una
categoría declarada, y su fórmula MUST NOT inferirse.

#### Scenario: Fórmula sin estrenar

- **WHEN** una fórmula del catálogo no tiene ninguna pieza
- **THEN** aparece igual, con uso cero

#### Scenario: Pieza sin fórmula reconocible

- **WHEN** una pieza no declara una fórmula del catálogo ni puede derivarse con certeza
- **THEN** se agrupa como sin clasificar
- **AND** no se le asigna ninguna fórmula

#### Scenario: El catálogo no está disponible

- **WHEN** el catálogo no puede leerse
- **THEN** el resto del sistema sigue funcionando
- **AND** la vista de fórmulas informa que el catálogo no está disponible

### Requirement: El ranking muestra absoluto y tasa

El sistema SHALL permitir ordenar las piezas por una métrica de resultado, mostrando
tanto el valor absoluto como su tasa sobre el alcance primario de la pieza.

#### Scenario: Pieza de alto alcance y baja conversión

- **WHEN** una pieza tiene mucho alcance y pocos resultados
- **THEN** su posición por absoluto y su posición por tasa son ambas visibles

#### Scenario: Pieza sin alcance medido

- **WHEN** una pieza no tiene alcance primario
- **THEN** no se le calcula tasa
- **AND** no se la trata como tasa cero

### Requirement: Ninguna métrica mostrada es estimada

El sistema MUST NOT mostrar un valor numérico que no provenga de una medición
registrada. La ausencia de un dato SHALL representarse como ausencia, nunca como cero.

#### Scenario: Métrica ausente

- **WHEN** una métrica no fue medida para una pieza
- **THEN** no se dibuja un valor para esa métrica
- **AND** no se muestra cero en su lugar

### Requirement: Las piezas sin trackear aparecen donde su ausencia mentiría

Las piezas sin cobertura de medición SHALL incluirse en las vistas de inventario y de
deuda, y MUST NOT incluirse en los indicadores agregados, la cadencia ni el uso de
fórmulas.

#### Scenario: Corpus histórico sin metadatos

- **WHEN** un canal tiene la mayoría de sus piezas sin metadatos
- **THEN** esas piezas se ven en inventario y en deuda
- **AND** no alteran las tasas agregadas de ese canal
