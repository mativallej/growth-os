# Spec Delta

## Purpose

Garantizar que el contenido de una marca no pueda alcanzar a quien mira la otra, y
que esa garantía sea verificable desde afuera en vez de depender de la disciplina de
quien escribe componentes.

## ADDED Requirements

### Requirement: El contenido de una marca no viaja en las vistas de la otra

Una vista correspondiente a una marca MUST NOT contener, en ninguna parte de su
respuesta, el contenido de piezas de otra marca. Esto SHALL cumplirse para el
documento servido y para cualquier dato que lo acompañe.

#### Scenario: Inspección de una vista de una marca

- **WHEN** se solicita cualquier vista de una marca
- **THEN** ningún fragmento del cuerpo de una pieza de otra marca aparece en la respuesta

#### Scenario: Vista de detalle

- **WHEN** se solicita el detalle de una pieza
- **THEN** la respuesta contiene únicamente contenido de la marca a la que esa pieza pertenece

### Requirement: La marca se determina en el servidor

La marca de una vista SHALL determinarse antes de construir la respuesta. El filtrado
por marca MUST NOT depender de lógica ejecutada en el navegador.

#### Scenario: Con el navegador sin ejecutar nada

- **WHEN** se obtiene una vista sin ejecutar su código de cliente
- **THEN** el contenido visible corresponde solo a la marca de esa vista

### Requirement: Un build restringido no emite las vistas excluidas

Cuando un build se restringe a un subconjunto de fuentes, MUST NOT producirse
ninguna vista de las marcas excluidas.

#### Scenario: Build de una sola marca

- **WHEN** se construye el proyecto restringido a una marca
- **THEN** no existe ninguna vista de las otras marcas
- **AND** ningún artefacto del build contiene contenido de las otras marcas

#### Scenario: Una sola marca disponible

- **WHEN** el build incluye una sola marca
- **THEN** la interfaz no ofrece cambiar de marca

### Requirement: Los enlaces ya compartidos siguen resolviendo

La introducción del segmento de marca MUST NOT romper los enlaces publicados antes
del cambio.

#### Scenario: Enlace anterior a la separación

- **WHEN** se solicita una ruta con la forma anterior
- **THEN** se redirige a su equivalente con marca
- **AND** el identificador de la pieza se conserva

### Requirement: El aislamiento se verifica antes de compartir

El proyecto SHALL disponer de una verificación ejecutable del aislamiento, y esa
verificación SHALL ejecutarse antes de dar por terminado cualquier cambio que toque
rutas, datos o componentes compartidos.

#### Scenario: Verificación en verde

- **WHEN** se ejecuta la verificación de aislamiento sobre todas las vistas de una marca
- **THEN** informa que ninguna contiene contenido de otra marca

#### Scenario: Una regresión de aislamiento

- **WHEN** un cambio hace que contenido de una marca alcance una vista de otra
- **THEN** la verificación falla e identifica la vista afectada
