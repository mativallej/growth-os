# Spec Delta

## Purpose

Conectar una pieza publicada con lo que ocurre después fuera de la red social,
manteniendo separadas señales que miden cosas distintas, y sin que el sistema afirme
más de lo que la evidencia sostiene.

## ADDED Requirements

### Requirement: Cada pieza puede producir un enlace rastreable propio

El sistema SHALL poder generar, para cualquier pieza, un enlace que la identifique de
forma única entre todas las piezas.

#### Scenario: Enlace de una pieza

- **WHEN** se solicita el enlace rastreable de una pieza
- **THEN** se obtiene un enlace que la distingue de cualquier otra
- **AND** identifica también la red por la que se publica

#### Scenario: Dos piezas del mismo canal

- **WHEN** se generan los enlaces de dos piezas distintas del mismo canal
- **THEN** los enlaces se distinguen entre sí

#### Scenario: El mismo enlace, dos veces

- **WHEN** se solicita dos veces el enlace de la misma pieza
- **THEN** se obtiene el mismo enlace

### Requirement: El identificador de atribución es el de la pieza

El identificador usado para atribuir SHALL ser el mismo con el que el sistema ya
identifica la pieza. MUST NOT introducirse un espacio de identificadores paralelo.

#### Scenario: Correspondencia con el registro de la pieza

- **WHEN** se observa un identificador de atribución
- **THEN** puede localizarse la pieza correspondiente sin ninguna tabla de traducción

### Requirement: Las señales de atribución no se colapsan

El sistema SHALL presentar por separado las señales de atribución por clic,
auto-reportada y de serie temporal. MUST NOT combinarlas en un único valor.

#### Scenario: Las tres disponibles

- **WHEN** se consulta la atribución de un período
- **THEN** las tres señales se presentan por separado

#### Scenario: Señales en desacuerdo

- **WHEN** dos señales sugieren magnitudes distintas
- **THEN** ambas se muestran
- **AND** la discrepancia no se resuelve descartando una

#### Scenario: Una señal no disponible

- **WHEN** una de las señales no está disponible
- **THEN** se indica que falta
- **AND** las otras se presentan igual

### Requirement: Primer toque y último toque se conservan por separado

Cuando se registre la procedencia de una conversión, el primer contacto conocido y el
último MUST NOT sobrescribirse entre sí.

#### Scenario: Varios contactos antes de convertir

- **WHEN** alguien llega por una pieza, vuelve más tarde por otra y recién ahí convierte
- **THEN** se conservan las dos procedencias
- **AND** puede reportarse por cualquiera de las dos

### Requirement: La falta de medición no se muestra como cero

Cuando no haya datos de conversión disponibles, el sistema MUST NOT presentar valores
en cero. SHALL indicar explícitamente que la conversión no se está midiendo.

#### Scenario: Circuito de atribución incompleto

- **WHEN** no existe medición de conversión para el período consultado
- **THEN** se indica que no se está midiendo
- **AND** no se muestra ningún valor de conversión

#### Scenario: Medición activa sin conversiones

- **WHEN** la medición está activa y no hubo conversiones
- **THEN** se muestra cero
- **AND** se distingue del caso anterior

### Requirement: Una pieza publicada sin enlace rastreable es deuda visible

El sistema SHALL identificar las piezas publicadas que no tienen enlace rastreable
asociado, como parte de su deuda de medición.

#### Scenario: Pieza publicada sin enlace

- **WHEN** una pieza está publicada y no tiene enlace rastreable
- **THEN** aparece como no atribuible
- **AND** se distingue de una pieza sin métricas

### Requirement: El sistema no afirma causalidad

El sistema MUST NOT presentar la relación entre una pieza y una conversión como
causal ni cuantificar el aporte de una pieza a un resultado.

#### Scenario: Pieza con conversiones atribuidas

- **WHEN** una pieza tiene conversiones atribuidas por clic
- **THEN** se informa cuántas llegaron por su enlace
- **AND** no se afirma que la pieza las haya causado
