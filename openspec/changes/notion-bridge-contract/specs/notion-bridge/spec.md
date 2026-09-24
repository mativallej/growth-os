# Spec Delta

## Purpose

Definir qué viaja entre los vaults y el espacio de colaboración, en qué sentido, y
qué garantías se dan antes de escribir en cualquiera de los dos lados.

## ADDED Requirements

### Requirement: Cada campo tiene un único dueño

Para cada campo sincronizado, exactamente un lado SHALL ser la autoridad. Ningún
campo SHALL ser escrito por ambos lados en la misma ejecución.

#### Scenario: El lado autoritativo cambia un campo

- **WHEN** el lado autoritativo de un campo lo modifica
- **THEN** la siguiente sincronización propaga ese valor al otro lado

#### Scenario: El lado no autoritativo cambia un campo

- **WHEN** el lado no autoritativo de un campo lo modifica
- **THEN** la siguiente sincronización restituye el valor del lado autoritativo

### Requirement: El estado inicial no se infiere sin evidencia

Al crear una entrada nueva, el estado SHALL derivarse del contenido de la pieza. Sin
una señal explícita, el estado SHALL ser el más conservador disponible, y la
cantidad de entradas en esa situación SHALL reportarse.

#### Scenario: Pieza sin ninguna señal de estado

- **WHEN** se crea la entrada de una pieza que no declara estado
- **THEN** su estado es el conservador
- **AND** no se le asigna un estado de trabajo en curso

#### Scenario: Pieza con evidencia de publicación

- **WHEN** una pieza tiene un enlace al post publicado
- **THEN** su estado inicial es publicado

#### Scenario: Pieza con trabajo declarado en curso

- **WHEN** una pieza declara explícitamente que le falta un paso concreto para publicarse
- **THEN** su estado inicial es de trabajo en curso

### Requirement: El contenido y las campañas no comparten tablero

Las piezas de contenido y los creativos de campañas SHALL sincronizarse a destinos
distintos, con vocabularios de estado propios.

#### Scenario: Un creativo de campaña

- **WHEN** se sincroniza un creativo de una campaña
- **THEN** va al destino de campañas
- **AND** no aparece en el tablero de contenido

#### Scenario: Estado de un creativo

- **WHEN** un creativo está corriendo
- **THEN** su estado lo refleja con el vocabulario de campañas, no con el de publicación

### Requirement: El alcance de una sincronización es explícito

La herramienta SHALL requerir que se indique qué subconjunto sincronizar, y MUST NOT
asumir el conjunto completo cuando no se indicó.

#### Scenario: Ejecución sin alcance indicado

- **WHEN** se ejecuta sin indicar alcance
- **THEN** se solicita elegir uno
- **AND** se informa cuántos elementos hay en cada opción

#### Scenario: Alcance indicado explícitamente

- **WHEN** se indica un alcance
- **THEN** solo se procesa ese subconjunto

### Requirement: No se escribe sin previsualizar

Toda ejecución SHALL previsualizar los cambios sin aplicarlos, salvo que se pida
aplicar de forma explícita.

#### Scenario: Ejecución por defecto

- **WHEN** se ejecuta sin pedir aplicar
- **THEN** se listan los cambios que se harían
- **AND** ni los vaults ni el destino resultan modificados

### Requirement: El tablero refleja lo que está en movimiento

Las piezas publicadas hace más de un umbral configurable MUST NOT incorporarse al
tablero, salvo que se pida explícitamente incluir el archivo histórico. La cantidad
excluida SHALL informarse.

#### Scenario: Primera carga de un vault con historia

- **WHEN** se sincroniza por primera vez un vault con piezas publicadas hace mucho
- **THEN** solo entran las que están dentro del umbral
- **AND** se informa cuántas quedaron fuera

### Requirement: La sincronización nunca borra

La herramienta MUST NOT eliminar entradas del destino ni archivos de los vaults.

#### Scenario: Una pieza desaparece del vault

- **WHEN** una pieza que tenía entrada deja de existir en el vault
- **THEN** su entrada se conserva
- **AND** se reporta como huérfana

### Requirement: Cada vault declara qué publica

El alcance de lo que sale de cada vault SHALL estar declarado en configuración. Un
vault SHALL poder declarar que no publica documentación, y eso MUST NOT tratarse
como un error.

#### Scenario: Vault que solo publica contenido

- **WHEN** se pide sincronizar documentación de un vault que declara no publicarla
- **THEN** se informa que esa marca no publica documentación
- **AND** no se sincroniza nada

### Requirement: La documentación viaja en un solo sentido

El cuerpo de un documento SHALL sincronizarse únicamente desde el vault hacia el
destino. El destino MUST NOT ser fuente del cuerpo de un documento.

#### Scenario: Documento editado en el destino

- **WHEN** un documento se edita en el destino y luego se sincroniza
- **THEN** el cuerpo del vault prevalece
- **AND** el vault no se modifica

#### Scenario: Documento sin cambios

- **WHEN** se sincroniza un documento que no cambió desde la última vez
- **THEN** no se realiza ninguna escritura

### Requirement: Renombrar una etiqueta requiere migrar sus filas

Cuando una etiqueta de clasificación del destino se renombre, las entradas que la
usaban SHALL migrarse antes de retirar la etiqueta anterior. MUST NOT quedar
entradas sin clasificación como resultado de un renombre.

#### Scenario: Renombre de una etiqueta en uso

- **WHEN** se renombra una etiqueta usada por entradas existentes
- **THEN** al terminar, todas esas entradas tienen la etiqueta nueva
- **AND** ninguna quedó sin valor

### Requirement: Falta de credencial: mensaje, no traza

Cuando falte la credencial necesaria, la herramienta SHALL interrumpir con
instrucciones de cómo obtenerla, y MUST NOT fallar con un error de red o de
autorización sin explicación.

#### Scenario: Sin credencial configurada

- **WHEN** se ejecuta sin la credencial
- **THEN** se interrumpe indicando qué credencial falta y cómo obtenerla
