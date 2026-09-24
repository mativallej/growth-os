# Spec Delta

## Purpose

Hacer que ningún trabajo automático pueda fallar, ni dejar de ejecutarse, sin que una
persona se entere; y fijar el criterio de dónde corre cada trabajo.

## ADDED Requirements

### Requirement: Un trabajo que falla avisa por el canal humano

Todo trabajo agendado SHALL notificar su falla por el canal que una persona lee. Un
registro en un archivo MUST NOT ser el único testigo de una falla.

#### Scenario: El trabajo falla

- **WHEN** un trabajo agendado termina con error
- **THEN** se emite un aviso por el canal humano con el nombre del trabajo y la causa

#### Scenario: El trabajo tiene éxito y no produce novedades

- **WHEN** un trabajo se ejecuta correctamente y no hay nada que reportar
- **THEN** no se emite ningún aviso

### Requirement: La ausencia de ejecución se detecta

El sistema SHALL detectar que un trabajo agendado no se ejecutó dentro de su ventana
esperada y SHALL avisarlo. Esta detección MUST NOT depender de que el trabajo se
ejecute.

#### Scenario: El trabajo no corre en su ventana

- **WHEN** transcurre la ventana esperada de un trabajo sin que se haya ejecutado
- **THEN** se emite un aviso indicando cuál no corrió y desde cuándo

#### Scenario: Ejecución diferida

- **WHEN** un trabajo se ejecuta tarde pero dentro de una tolerancia declarada
- **THEN** no se considera ausencia

### Requirement: Cada trabajo corre donde vive el dato que lee

Un trabajo que lea archivos locales SHALL ejecutarse en la máquina que los contiene.
Un trabajo que lea un servicio remoto SHALL poder ejecutarse fuera de ella.

#### Scenario: Trabajo que lee archivos locales

- **WHEN** un trabajo necesita el estado actual de los archivos locales
- **THEN** se ejecuta donde esos archivos viven
- **AND** no se lo hace depender de una copia sincronizada

#### Scenario: Trabajo que lee un servicio remoto

- **WHEN** un trabajo solo necesita datos de un servicio remoto
- **THEN** no requiere la máquina local para ejecutarse

### Requirement: Un informe declara la antigüedad de sus datos

Todo informe automático SHALL declarar hasta qué momento están actualizados los datos
sobre los que informa.

#### Scenario: Informe sobre datos desactualizados

- **WHEN** se emite un informe cuya fuente no se actualizó recientemente
- **THEN** el informe indica la antigüedad de los datos
- **AND** esa indicación es visible sin abrir nada más

### Requirement: Ningún trabajo vigila un lugar vacío

Un trabajo de vigilancia SHALL verificar que la fuente que observa siga siendo el
lugar donde ocurren los eventos que busca, y SHALL avisar si esa fuente dejó de
recibir eventos durante un período declarado.

#### Scenario: La fuente se mudó

- **WHEN** un trabajo vigila una fuente que ya no recibe eventos
- **THEN** lo reporta en vez de informar "nada nuevo" indefinidamente
