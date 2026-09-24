# Spec Delta

## Purpose

Declarar de dónde salen las piezas de contenido, garantizar que la ausencia de una
fuente sea imposible de confundir con un conjunto vacío, y permitir recortar qué
fuentes entran a un build sin tocar código.

## ADDED Requirements

### Requirement: Las fuentes se declaran, no se adivinan

El sistema SHALL resolver la ubicación de cada fuente de contenido desde un
registro explícito. Ninguna ruta de fuente SHALL resolverse de forma relativa al
directorio de trabajo del proceso.

#### Scenario: Build desde cualquier directorio

- **WHEN** el build se ejecuta desde un directorio de trabajo cualquiera
- **THEN** las fuentes resuelven a las mismas rutas absolutas
- **AND** el resultado es idéntico al de un build ejecutado desde la raíz del repo

#### Scenario: El repo se mueve de lugar

- **WHEN** el repositorio se mueve a otra ruta del disco
- **THEN** las fuentes siguen resolviendo correctamente sin editar código

### Requirement: Una fuente ausente rompe el build

El sistema SHALL verificar que toda raíz declarada exista en disco antes de leer
contenido, y SHALL interrumpir con error si alguna falta. Un conjunto vacío de
piezas MUST NOT ser el resultado observable de una fuente ausente.

#### Scenario: Una raíz no existe

- **WHEN** una de las raíces declaradas no existe en disco
- **THEN** el proceso falla con un error que nombra la raíz faltante
- **AND** no se emite ninguna página

#### Scenario: Una raíz existe pero está vacía

- **WHEN** una raíz existe y no contiene ninguna pieza
- **THEN** el proceso completa
- **AND** el conteo de piezas de esa fuente se reporta explícitamente como cero

### Requirement: Una fuente puede tener varias raíces

El registro SHALL permitir que una fuente declare más de una raíz de contenido, y
SHALL tratar las piezas de todas ellas como pertenecientes a la misma fuente.

#### Scenario: Dos pipelines en el mismo vault

- **WHEN** una fuente declara dos raíces y ambas contienen piezas
- **THEN** las piezas de las dos aparecen bajo esa fuente
- **AND** la ruta relativa de cada pieza permite distinguir de qué raíz vino

### Requirement: El conjunto de fuentes de un build es configurable

El sistema SHALL permitir restringir, por configuración de entorno y sin cambios de
código, qué fuentes participan de un build. El valor por defecto SHALL incluir
todas las fuentes declaradas.

#### Scenario: Build restringido a una sola fuente

- **WHEN** se restringe el build a una única fuente
- **THEN** solo se leen las raíces de esa fuente
- **AND** ninguna pieza de las fuentes excluidas queda en el resultado

#### Scenario: Se nombra una fuente que no existe

- **WHEN** la configuración nombra una fuente que no está en el registro
- **THEN** el proceso falla con un error que lista las fuentes válidas

### Requirement: Auditoría read-only del estado de las fuentes

El proyecto SHALL proveer una auditoría ejecutable que reporte, por fuente, cuántos
archivos hay, cuántos son piezas legibles, cuántos carecen de metadata, y qué claves
desconocidas aparecen. La auditoría MUST NOT escribir en los vaults.

#### Scenario: Auditar antes de cambiar el parser

- **WHEN** se ejecuta la auditoría
- **THEN** imprime los conteos por fuente y las claves desconocidas por frecuencia
- **AND** ningún archivo de los vaults resulta modificado

#### Scenario: Colisión de identificadores

- **WHEN** dos piezas de fuentes distintas producirían el mismo identificador público
- **THEN** la auditoría lo reporta como colisión
