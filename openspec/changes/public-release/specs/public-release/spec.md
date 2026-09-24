# Spec Delta

## Purpose

Permitir que el proyecto se publique sin exponer a terceros ni al espacio de trabajo
de su autor, y sin perder la evidencia concreta que hace que su documentación sea
útil.

## ADDED Requirements

### Requirement: Ninguna persona ajena es identificable en el repositorio

El repositorio público MUST NOT contener el nombre ni datos identificatorios de
personas distintas del autor. Cuando sea necesario referirse a ellas, SHALL hacerse
por su rol.

#### Scenario: Referencia a un colaborador externo

- **WHEN** la documentación necesita referirse al trabajo de otra persona
- **THEN** se la nombra por su rol
- **AND** no aparece su nombre

#### Scenario: Evaluación del trabajo de un tercero

- **WHEN** la documentación describe problemas originados en el trabajo de otra persona
- **THEN** describe el problema técnico
- **AND** no lo atribuye a una persona identificable

### Requirement: La información sensible se nombra por su función

Cuando la documentación necesite referirse a contenido personal sensible del autor o
a información reservada de su empresa, SHALL describirlo por su función en el sistema
y MUST NOT reproducir su contenido.

#### Scenario: Requisito de privacidad entre marcas

- **WHEN** se explica por qué dos marcas no pueden mezclarse
- **THEN** se indica que una contiene contenido personal sensible
- **AND** no se describe cuál es ese contenido

#### Scenario: Métrica de negocio como evidencia

- **WHEN** una afirmación se apoyaba en una métrica reservada
- **THEN** se conserva la forma de la evidencia sin el valor exacto
- **AND** la afirmación sigue siendo verificable en su propia instalación

### Requirement: La evidencia técnica se conserva

El saneamiento MUST NOT eliminar la descripción de los fallos que fundamentan las
reglas del proyecto, ni lo que costaron.

#### Scenario: Regla derivada de un fallo

- **WHEN** una regla existe porque algo se rompió
- **THEN** la documentación conserva qué se rompió, cómo se detectó y qué se perdió
- **AND** eso puede entenderse sin conocer el espacio de trabajo del autor

### Requirement: El proyecto arranca sin la configuración del autor

El repositorio MUST NOT contener la configuración real de ninguna instalación. SHALL
incluir un ejemplo completo y documentado del que se parte.

#### Scenario: Primera instalación

- **WHEN** alguien clona el repositorio por primera vez
- **THEN** encuentra un ejemplo de configuración con todos los campos explicados
- **AND** no encuentra rutas ni cuentas de otra persona

#### Scenario: Arranque sin configurar

- **WHEN** se ejecuta el proyecto sin haber creado la configuración propia
- **THEN** se indica qué falta y cómo crearla
- **AND** no se intenta ninguna operación

### Requirement: Ningún identificador de un espacio de trabajo concreto está en el código

Los identificadores de destinos externos SHALL provenir de configuración. MUST NOT
estar escritos en el código fuente.

#### Scenario: Otra instalación

- **WHEN** otra persona configura sus propios destinos
- **THEN** el sistema opera sobre los suyos
- **AND** no se requiere modificar código

#### Scenario: Identificador ausente

- **WHEN** falta un identificador en la configuración
- **THEN** se indica cuál falta antes de intentar cualquier operación

### Requirement: El repositorio declara qué es, para quién y qué no hace

El repositorio SHALL incluir documentación de entrada que explique el problema que
resuelve, qué supone del entorno de quien lo use, y qué queda explícitamente fuera de
alcance.

#### Scenario: Alguien evalúa si le sirve

- **WHEN** una persona llega al repositorio sin contexto previo
- **THEN** puede determinar si le sirve sin leer el código

#### Scenario: Operaciones sobre datos propios

- **WHEN** la documentación describe las operaciones disponibles
- **THEN** advierte cuáles modifican archivos del usuario
- **AND** indica cómo previsualizarlas antes de aplicarlas

### Requirement: Las condiciones de uso están declaradas

El repositorio SHALL incluir una licencia.

#### Scenario: Uso por un tercero

- **WHEN** alguien quiere usar o modificar el proyecto
- **THEN** encuentra las condiciones en el repositorio
