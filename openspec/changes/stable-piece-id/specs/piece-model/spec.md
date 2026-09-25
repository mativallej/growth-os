# Spec Delta

## Purpose

Definir la identidad de una pieza: qué la hace la misma pieza después de moverla,
renombrarla o reorganizar la carpeta que la contiene — de modo que cualquier sistema
externo pueda referirse a ella sin romperse cuando el vault se reordena.

## ADDED Requirements

### Requirement: Una pieza tiene un identificador propio y estable

Cada pieza SHALL llevar un identificador en su footer. Ese identificador SHALL
sobrevivir a mover el archivo, renombrarlo y reorganizar su carpeta, y SHALL no
cambiar nunca una vez asignado.

#### Scenario: La pieza se mueve de carpeta

- **WHEN** una pieza cambia de ruta dentro del vault
- **THEN** su identificador es el mismo antes y después
- **AND** un sistema externo que la referencie por identificador la sigue encontrando

#### Scenario: La pieza se renombra

- **WHEN** el nombre del archivo cambia
- **THEN** su identificador no cambia

#### Scenario: Reorganización masiva

- **WHEN** se reorganiza el árbol de contenido completo
- **THEN** ninguna referencia por identificador queda huérfana

### Requirement: El identificador es opaco

El identificador SHALL no codificar red, cuenta, fecha, fórmula, formato ni orden de
creación. Un lector SHALL no derivar ningún dato de la pieza a partir de él.

#### Scenario: Cambia un atributo de la pieza

- **WHEN** una pieza cambia de fórmula, de red o de estado
- **THEN** su identificador no cambia
- **AND** ningún consumidor necesita recalcularlo

### Requirement: El identificador no se genera al leer

Un lector SHALL no asignar un identificador a una pieza que no lo tiene. Una pieza sin
identificador SHALL reportarse como tal, y la cantidad SHALL quedar a la vista.

#### Scenario: Pieza sin identificador

- **WHEN** se lee una pieza que no tiene identificador
- **THEN** la pieza se carga igual, marcada como sin identificar
- **AND** el resumen de carga reporta cuántas están en esa condición

#### Scenario: Dos lecturas de la misma pieza sin identificador

- **WHEN** se lee dos veces una pieza sin identificador
- **THEN** ninguna de las dos lecturas inventa un valor
- **AND** la pieza no aparece con identificadores distintos entre builds

### Requirement: Los identificadores repetidos se detectan y se reportan

Un lector SHALL detectar dos piezas con el mismo identificador y SHALL reportarlas
nombrando las dos rutas. Un identificador repetido SHALL no resolverse eligiendo una
de las dos en silencio.

#### Scenario: Una pieza se duplica como punto de partida

- **WHEN** dos piezas declaran el mismo identificador
- **THEN** la colisión se reporta con las dos rutas
- **AND** ninguna referencia externa se resuelve hacia una de ellas

### Requirement: El emparejamiento externo usa el identificador

Un sistema externo que referencie piezas SHALL emparejar por identificador. La ruta
del archivo SHALL quedar como dato informativo, nunca como llave.

#### Scenario: Fila externa contra pieza movida

- **WHEN** una fila externa referencia una pieza que cambió de ruta
- **THEN** la fila empareja por identificador
- **AND** la ruta informativa de la fila se actualiza a la nueva

#### Scenario: Fila externa sin identificador

- **WHEN** una fila externa no tiene identificador porque es anterior al cambio
- **THEN** se reporta como pendiente de re-llavear
- **AND** no se empareja por ruta como respaldo silencioso

### Requirement: La asignación ocurre al crear, o en un backfill declarado

Un identificador SHALL asignarse cuando la pieza se crea. Una operación de backfill
SHALL poder asignarlo a piezas existentes, y SHALL no reasignarlo a una pieza que ya
lo tiene.

#### Scenario: Backfill corrido dos veces

- **WHEN** el backfill corre sobre un vault donde ya asignó identificadores
- **THEN** ninguna pieza cambia de identificador
- **AND** el reporte dice cuántas ya lo tenían

#### Scenario: Backfill sobre un vault en movimiento

- **WHEN** el vault tiene cambios sin commitear al momento de correr el backfill
- **THEN** la operación se detiene antes de escribir
- **AND** informa que no puede garantizar consistencia
