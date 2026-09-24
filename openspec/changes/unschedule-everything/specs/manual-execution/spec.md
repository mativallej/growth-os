# Spec Delta

## Purpose

Garantizar que ninguna operación del sistema modifique nada sin que una persona la
haya disparado en ese momento, y que esa persona reciba el resultado sin tener que
buscarlo.

## ADDED Requirements

### Requirement: Ninguna operación se ejecuta sin disparo humano

El sistema MUST NOT ejecutar operaciones que modifiquen datos de forma automática,
periódica o diferida. Toda ejecución SHALL originarse en una acción explícita de una
persona.

#### Scenario: El sistema queda inactivo

- **WHEN** transcurre cualquier período sin acción de una persona
- **THEN** ningún dato de los vaults ni del destino de colaboración resulta modificado

#### Scenario: Un trabajo agendado remanente

- **WHEN** se inspecciona el sistema operativo en busca de trabajos agendados del proyecto
- **THEN** no existe ninguno

### Requirement: El resultado se informa en el momento del disparo

Toda operación SHALL reportar lo que hizo, o lo que falló, a quien la disparó,
durante esa misma interacción. Un archivo de registro MUST NOT ser el único testigo
del resultado.

#### Scenario: Operación con éxito

- **WHEN** una operación termina correctamente
- **THEN** quien la disparó ve qué se modificó y cuánto

#### Scenario: Operación que falla

- **WHEN** una operación termina con error
- **THEN** quien la disparó ve la causa sin abrir ningún archivo

### Requirement: La antigüedad de cada operación es visible

El sistema SHALL mostrar, para cada operación disponible, hace cuánto se ejecutó por
última vez con éxito.

#### Scenario: Operación que hace mucho no se corre

- **WHEN** una operación no se ejecuta desde hace más de su período esperado
- **THEN** su antigüedad se muestra de forma destacada

#### Scenario: Operación nunca ejecutada

- **WHEN** una operación nunca se ejecutó
- **THEN** se indica que nunca se ejecutó, y no se muestra como reciente

### Requirement: Una operación interrumpida se puede repetir sin duplicar

Si una operación se interrumpe antes de terminar, repetirla SHALL producir el mismo
resultado que si hubiera terminado, sin duplicar lo ya hecho.

#### Scenario: Interrupción a mitad de camino

- **WHEN** una operación se interrumpe después de aplicar parte de sus cambios
- **THEN** lo aplicado queda registrado
- **AND** una nueva ejecución completa lo que faltaba sin repetir lo hecho
