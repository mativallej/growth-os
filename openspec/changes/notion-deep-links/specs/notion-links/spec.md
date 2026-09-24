# Spec Delta

## Purpose

Permitir navegar entre la plataforma y el destino de colaboración sin buscar a mano, y
sin que el vault cargue con artefactos de una herramienta externa.

## ADDED Requirements

### Requirement: Los destinos del workspace son accesibles desde la interfaz

La plataforma SHALL ofrecer acceso directo a los destinos configurados del espacio de
colaboración. Sus direcciones SHALL provenir de configuración.

#### Scenario: Destinos configurados

- **WHEN** se consulta la interfaz
- **THEN** los destinos configurados son accesibles
- **AND** sus direcciones no están escritas en el código

#### Scenario: Un destino sin configurar

- **WHEN** un destino no está configurado
- **THEN** no se ofrece su acceso
- **AND** no se muestra un enlace que no lleve a ninguna parte

### Requirement: Una pieza sincronizada enlaza a su registro

Cuando exista correspondencia conocida entre una pieza y su registro en el destino, la
plataforma SHALL ofrecer el acceso directo a ese registro desde la pieza.

#### Scenario: Pieza con registro conocido

- **WHEN** se consulta una pieza que tiene registro en el destino
- **THEN** se ofrece el acceso a ese registro

#### Scenario: Pieza sin registro conocido

- **WHEN** no se conoce registro para una pieza
- **THEN** se indica que no está sincronizada
- **AND** no se ofrece ningún enlace

### Requirement: La correspondencia no se guarda en el vault

La correspondencia entre piezas y registros MUST NOT escribirse en los archivos del
vault. SHALL guardarse como estado local de la plataforma, descartable sin pérdida.

#### Scenario: Se borra el estado local

- **WHEN** se elimina el estado local de la plataforma
- **THEN** ningún archivo del vault resulta afectado
- **AND** la correspondencia se reconstruye en la siguiente sincronización

#### Scenario: El vault leído por otra herramienta

- **WHEN** un archivo del vault se abre con cualquier otra herramienta
- **THEN** no contiene identificadores del destino de colaboración

### Requirement: La sincronización registra la correspondencia

Cuando la sincronización cree o reconozca el registro de una pieza, SHALL guardar la
correspondencia.

#### Scenario: Registro nuevo

- **WHEN** la sincronización crea el registro de una pieza
- **THEN** la correspondencia queda guardada

#### Scenario: Registro preexistente

- **WHEN** la sincronización encuentra que una pieza ya tenía registro
- **THEN** la correspondencia queda guardada igual

#### Scenario: Previsualización

- **WHEN** la sincronización se ejecuta sin aplicar
- **THEN** no se modifica la correspondencia guardada

### Requirement: La correspondencia declara su antigüedad

La plataforma SHALL informar de cuándo data la correspondencia, y MUST NOT presentarla
como verdad actual del destino.

#### Scenario: Correspondencia antigua

- **WHEN** la correspondencia no se actualiza desde hace más de lo esperado
- **THEN** su antigüedad se indica junto a los enlaces

#### Scenario: Sin correspondencia registrada

- **WHEN** nunca se registró correspondencia
- **THEN** se indica que no hay sincronización previa

### Requirement: Los enlaces respetan la frontera entre marcas

Un enlace ofrecido desde el contexto de una marca MUST NOT apuntar al registro de una
pieza de otra marca.

#### Scenario: Enlace desde una marca

- **WHEN** se ofrece el enlace de una pieza
- **THEN** apunta al registro de la marca a la que esa pieza pertenece
