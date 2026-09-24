# Spec Delta

## Purpose

Mantener la correspondencia entre una pieza del vault y su registro en el destino de
colaboración a lo largo del tiempo, incluso cuando el archivo cambia de ubicación, y
evitar que una reorganización se confunda con la creación de contenido nuevo.

## ADDED Requirements

### Requirement: Un movimiento masivo detiene la sincronización

Cuando una proporción significativa de los registros existentes quede sin archivo
correspondiente en la misma ejecución, el sistema SHALL detenerse sin crear ni
modificar nada, e informar la situación.

#### Scenario: Reorganización del vault

- **WHEN** una ejecución encuentra que muchos registros quedaron sin archivo y aparecieron muchos archivos sin registro
- **THEN** no se crea ningún registro nuevo
- **AND** se informa cuántos quedaron sin archivo y cuántos archivos no tienen registro

#### Scenario: Crecimiento normal

- **WHEN** aparecen archivos nuevos sin que se pierdan registros existentes
- **THEN** la sincronización procede normalmente

#### Scenario: Una pieza que se borró de verdad

- **WHEN** desaparece un archivo aislado sin que aparezca ninguno equivalente
- **THEN** su registro se reporta como huérfano
- **AND** no se elimina

### Requirement: Una pieza movida se vuelve a emparejar

Cuando un registro quede sin archivo y exista un archivo sin registro que
corresponda a la misma pieza, el sistema SHALL actualizar la llave del registro
existente en lugar de crear uno nuevo.

#### Scenario: Archivo movido de carpeta

- **WHEN** una pieza cambia de ubicación sin cambiar de contenido
- **THEN** su registro conserva su identidad, su estado y su historia
- **AND** no se crea un registro nuevo

#### Scenario: Movimiento de muchas piezas a la vez

- **WHEN** una reorganización mueve muchas piezas
- **THEN** cada una se vuelve a emparejar con su registro
- **AND** el recuento de registros no aumenta

### Requirement: Un emparejamiento ambiguo no se aplica solo

Cuando la evidencia no permita determinar con certeza que dos elementos son la misma
pieza, el sistema MUST NOT emparejarlos por su cuenta.

#### Scenario: Dos candidatos igual de plausibles

- **WHEN** un registro huérfano podría corresponder a más de un archivo sin registro
- **THEN** no se empareja con ninguno
- **AND** se listan los candidatos para que una persona decida

#### Scenario: Sin ningún candidato

- **WHEN** un registro huérfano no tiene ningún archivo que pueda corresponderle
- **THEN** se reporta como huérfano y se deja intacto

### Requirement: La reconciliación opera sobre un estado detenido del vault

La reconciliación SHALL registrar el estado del vault al comenzar y SHALL verificar
que no haya cambiado antes de escribir. Si cambió, MUST NOT aplicar nada.

#### Scenario: El vault cambia durante la operación

- **WHEN** el vault se modifica entre el momento de calcular el mapeo y el de aplicarlo
- **THEN** no se aplica ningún cambio
- **AND** se informa que el vault se movió y hay que recalcular

#### Scenario: Verificación antes de cada escritura

- **WHEN** se va a actualizar la llave de un registro
- **THEN** se verifica que el archivo destino exista en ese momento
- **AND** si no existe, ese registro no se toca

### Requirement: Los re-emparejamientos se informan

Todo cambio de llave de un registro SHALL informarse, indicando la ubicación anterior
y la nueva.

#### Scenario: Re-emparejamiento aplicado

- **WHEN** se actualiza la llave de un registro
- **THEN** se informa qué registro cambió, desde dónde y hacia dónde
