# Spec Delta

## Purpose

Definir qué es una pieza de contenido para este sistema, cómo se extraen sus
metadatos de un vault escrito por humanos con más de una convención, y cómo se
representa una pieza de la que no se sabe nada — de modo que la falta de datos sea
visible en vez de invisible.

## ADDED Requirements

### Requirement: El parser lee el contrato de footer vigente

El parser SHALL interpretar las líneas de corte de métricas en el formato definido
por el contrato de footer del proyecto. Un corte escrito por la herramienta de
ingesta SHALL ser legible por el parser sin transformación intermedia.

#### Scenario: Corte en el formato vigente

- **WHEN** una pieza tiene una línea de corte en el formato del contrato
- **THEN** sus métricas quedan disponibles como un corte fechado
- **AND** el horizonte declarado en la línea se conserva

#### Scenario: Corte en un formato histórico

- **WHEN** una pieza tiene cortes en un formato anterior del contrato
- **THEN** también se interpretan
- **AND** conviven con los del formato vigente en la misma pieza

#### Scenario: Ida y vuelta con la ingesta

- **WHEN** la herramienta de ingesta escribe un corte en una pieza
- **THEN** una lectura posterior del parser reporta ese corte con los mismos valores

### Requirement: Las dos gramáticas de footer se leen

El parser SHALL interpretar tanto los metadatos escritos como un elemento por línea
como los escritos con varios elementos en una misma línea separados por un
delimitador. Solo las claves de un vocabulario conocido SHALL tomarse como
metadatos.

#### Scenario: Metadatos en una línea por clave

- **WHEN** una pieza declara sus metadatos con una clave por línea
- **THEN** todas las claves conocidas quedan disponibles

#### Scenario: Metadatos en una línea compartida

- **WHEN** una pieza declara varias claves en una misma línea
- **THEN** todas las claves conocidas quedan disponibles

#### Scenario: Prosa que parece metadato

- **WHEN** el cuerpo de la pieza contiene una línea con forma de clave y valor pero con una clave fuera del vocabulario
- **THEN** esa línea no se interpreta como metadato

#### Scenario: El delimitador aparece dentro de un valor

- **WHEN** el valor de una clave contiene el delimitador de la gramática compartida
- **THEN** el valor se conserva completo

### Requirement: Ninguna pieza se descarta por falta de metadatos

El parser MUST NOT excluir un archivo de contenido por carecer de footer o de
metadatos. Cada pieza SHALL exponer explícitamente su nivel de cobertura de
medición.

#### Scenario: Archivo sin metadatos

- **WHEN** un archivo de contenido no tiene ningún metadato reconocible
- **THEN** igual se representa como pieza
- **AND** su cobertura queda marcada como no trackeada

#### Scenario: Pieza con la medición declarada pendiente

- **WHEN** una pieza declara su medición como pendiente
- **THEN** su cobertura se distingue de la de una pieza sin footer

#### Scenario: Archivo ilegible

- **WHEN** un archivo no puede leerse o parsearse
- **THEN** el hecho se cuenta y se reporta
- **AND** el proceso continúa con el resto

### Requirement: Cada pieza conoce su marca

El modelo de pieza SHALL incluir la marca a la que pertenece, derivada de la fuente
de la que se leyó. Ninguna pieza SHALL quedar sin marca.

#### Scenario: Piezas de dos marcas en el mismo conjunto

- **WHEN** se cargan piezas de más de una fuente
- **THEN** cada pieza indica su marca
- **AND** el conjunto puede particionarse por marca sin ambigüedad

### Requirement: Los campos de clasificación se normalizan sin inventar

El parser SHALL normalizar canal y estado a un conjunto cerrado de valores,
conservando el valor crudo. Cuando el valor crudo no corresponda con claridad a
ninguno del conjunto, el normalizado SHALL ser desconocido.

#### Scenario: Estado ambiguo

- **WHEN** el estado declarado no corresponde con claridad a ningún valor conocido
- **THEN** el estado normalizado es desconocido
- **AND** el valor crudo queda disponible

#### Scenario: El canal se deduce de la ubicación

- **WHEN** una pieza no declara canal pero su ubicación lo identifica
- **THEN** el canal se deriva de la ubicación
- **AND** queda registrado que se derivó

#### Scenario: Dos nombres para el mismo canal

- **WHEN** dos piezas nombran el mismo canal de formas distintas
- **THEN** las dos normalizan al mismo canal

### Requirement: Alcance primario comparable entre canales

El modelo SHALL exponer una medida de alcance primario por pieza, derivada de la
métrica de alcance que corresponda a su canal, de modo que piezas de canales
distintos puedan ordenarse en una misma lista.

#### Scenario: Ordenar piezas de dos canales

- **WHEN** se ordenan por alcance piezas de canales que usan métricas de alcance distintas
- **THEN** ninguna pieza queda en cero por no tener la métrica del otro canal

#### Scenario: Pieza sin ninguna métrica de alcance

- **WHEN** una pieza no tiene ninguna métrica de alcance medida
- **THEN** su alcance primario es ausente, no cero

### Requirement: Los identificadores públicos no cambian

El identificador público de una pieza SHALL permanecer estable frente a cambios del
parser. Un cambio que altere identificadores ya publicados MUST NOT aplicarse sin
declararlo explícitamente.

#### Scenario: Cambio de parser sin cambio de identificadores

- **WHEN** se modifica el parser
- **THEN** los identificadores de las piezas preexistentes coinciden con el baseline registrado

### Requirement: La definición de pieza es única en todo el proyecto

El criterio de qué archivo cuenta como pieza SHALL ser equivalente en todas las
herramientas del proyecto que lean los vaults, independientemente del lenguaje en
que estén escritas.

#### Scenario: El mismo vault leído por dos herramientas

- **WHEN** dos herramientas del proyecto leen la misma fuente
- **THEN** ambas reconocen el mismo conjunto de archivos como piezas
