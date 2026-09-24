# Spec Delta

## Purpose

Reunir en un solo lugar todas las operaciones del sistema, con sus parámetros y sus
precondiciones, de modo que operar no dependa de recordar qué scripts existen ni
dónde viven; y fijar qué puede hacer la aplicación por su cuenta y qué no.

## ADDED Requirements

### Requirement: Las operaciones se declaran en un catálogo

El sistema SHALL exponer sus operaciones desde una declaración única. Agregar,
quitar o modificar una operación MUST NOT requerir cambios en la interfaz.

#### Scenario: Se agrega una operación

- **WHEN** se agrega una operación a la declaración
- **THEN** aparece en la consola con su nombre, su descripción y sus parámetros
- **AND** no se modificó ningún componente de interfaz

#### Scenario: Operación declarada para una sola marca

- **WHEN** una operación declara que aplica solo a una marca
- **THEN** no se ofrece desde las vistas de las otras

### Requirement: La aplicación no ejecuta operaciones que modifican datos

La aplicación MUST NOT aplicar por sí misma ninguna operación que escriba en los
vaults o en el destino de colaboración. Estas operaciones SHALL delegarse a una
sesión donde una persona pueda revisarlas antes de aplicarlas.

#### Scenario: Operación de escritura

- **WHEN** una persona dispara una operación que modifica datos
- **THEN** la aplicación prepara la operación y la entrega a una sesión local
- **AND** ningún dato resulta modificado por la aplicación misma

#### Scenario: Contexto de la entrega

- **WHEN** se entrega una operación a una sesión
- **THEN** la sesión recibe qué se pidió, con qué parámetros, y qué conviene revisar antes de aplicar

### Requirement: Las operaciones de solo lectura producen un archivo

Una operación declarada de solo lectura SHALL poder ejecutarse en la aplicación y
entregar su resultado como archivo descargable.

#### Scenario: Exportar con filtros

- **WHEN** se ejecuta una exportación con un conjunto de filtros
- **THEN** se descarga un archivo con exactamente las filas que cumplen esos filtros

#### Scenario: El archivo declara su origen

- **WHEN** se genera una exportación
- **THEN** el archivo incluye los filtros con los que se generó y la fecha de generación

#### Scenario: Exportación sin resultados

- **WHEN** ninguna fila cumple los filtros
- **THEN** se informa que no hay resultados
- **AND** no se descarga un archivo vacío sin explicación

### Requirement: Ads y orgánico son una dimensión propia

Toda operación que opere sobre contenido SHALL aceptar como dimensión explícita si
aplica a contenido orgánico, a creativos de campañas, o a ambos. Esta dimensión MUST
NOT tratarse como un valor más de canal.

#### Scenario: Exportar solo orgánico

- **WHEN** se exporta restringiendo a contenido orgánico
- **THEN** ningún creativo de campaña aparece en el resultado

#### Scenario: Exportar solo campañas

- **WHEN** se exporta restringiendo a creativos de campañas
- **THEN** ninguna pieza de contenido orgánico aparece en el resultado

#### Scenario: Sin elección explícita

- **WHEN** no se elige valor para esta dimensión
- **THEN** la operación usa el valor declarado por defecto en el catálogo
- **AND** ese valor es visible antes de ejecutar

### Requirement: Las precondiciones se evalúan antes de ofrecer la operación

Cada operación SHALL declarar sus precondiciones, y el sistema SHALL evaluarlas al
presentar el catálogo. Una operación cuyas precondiciones no se cumplen MUST NOT
poder dispararse.

#### Scenario: Falta un insumo

- **WHEN** una operación requiere un insumo que no está disponible
- **THEN** se muestra qué falta y cómo obtenerlo
- **AND** la operación no puede dispararse

#### Scenario: Precondiciones cumplidas

- **WHEN** todas las precondiciones de una operación se cumplen
- **THEN** la operación puede dispararse

### Requirement: Cada operación muestra su antigüedad

El catálogo SHALL mostrar, para cada operación, hace cuánto se ejecutó por última vez
con éxito.

#### Scenario: Operación que hace mucho no corre

- **WHEN** una operación no se ejecuta desde hace más de su período declarado
- **THEN** su antigüedad se muestra de forma destacada

#### Scenario: Operación nunca ejecutada

- **WHEN** una operación no tiene registro de ejecución
- **THEN** se indica que nunca se ejecutó

### Requirement: La consola no existe fuera del entorno local

Las capacidades de operación MUST NOT estar presentes en un build destinado a
compartirse. Su ausencia SHALL ser estructural, no una ocultación de la interfaz.

#### Scenario: Build compartido

- **WHEN** se construye el proyecto para compartir
- **THEN** no existe ninguna ruta ni manejador de operación en el resultado
- **AND** solicitarlos no produce ninguna ejecución

#### Scenario: Build local

- **WHEN** se ejecuta el proyecto en el entorno local
- **THEN** la consola está disponible

### Requirement: Ninguna operación se dispara al navegar

Una operación MUST NOT ejecutarse como consecuencia de navegar, precargar o
recargar una vista.

#### Scenario: Navegación y recarga

- **WHEN** se navega a la consola o se recarga
- **THEN** no se ejecuta ninguna operación

### Requirement: Los parámetros se validan contra el catálogo

Todo parámetro recibido SHALL validarse contra lo declarado en el catálogo antes de
usarse. Un valor no declarado MUST NOT alcanzar la ejecución.

#### Scenario: Parámetro fuera de lo declarado

- **WHEN** se recibe un valor que el catálogo no admite
- **THEN** la operación se rechaza indicando qué parámetro es inválido
- **AND** no se inicia ninguna ejecución
