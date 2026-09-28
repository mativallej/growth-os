# Tasks

> Se puede escribir antes que `operations-console`, con la parte de operaciones en
> prosa, y enriquecer después. Lo que no se puede es escribir a mano lo que ya está
> declarado en la configuración.

## 1. El derivador

- [x] 1.1 Leer de la configuración de fuentes: marcas, raíces, alcances de sincronización, prefijos de campañas. Verifica: agregar una fuente y confirmar que aparece sin tocar la vista.
- [x] 1.2 Leer el catálogo de operaciones, si ya existe; si no, dejar el punto de extensión y la prosa provisoria marcada como tal.

## 2. La tabla de dueños de campo

- [x] 2.1 Declarar la propiedad de cada campo compartido en un solo lugar, y que tanto el mapa como la documentación del puente lo lean de ahí. Verifica: no hay dos listas de dueños que puedan discrepar.
- [x] 2.2 Incluir qué pasa cuando se modifica un campo en la capa que no manda.

## 3. La vista

- [x] 3.1 Las tres capas, qué se hace en cada una, y la dirección de la información.
- [x] 3.2 Para cada capa, qué **no** le corresponde.
- [x] 3.3 La prosa del porqué: corta, y sin repetir lo que se deriva.
- [x] 3.4 Verificar en ancho de teléfono.
  > **OBSOLETA (2026-09-28).** La página se borró el 2026-09-26: con varios vaults repetía la misma explicación por marca. Su doctrina vive en `docs/metodo.md`.

## 4. Cerrar

- [x] 4.1 Test de que la vista no contiene contenido de piezas ni creativos.
- [x] 4.2 Que una persona ajena al proyecto lo lea y diga qué no se entiende. Anotar acá qué cambió después de esa lectura.
  > **OBSOLETA (2026-09-28).** Misma razón: no hay página que leer. Lo que sí necesita un lector externo es el README — eso es `public-release` 4.3, y sigue abierta.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **200 tests** · la vista está en `/[account]/mapa`.

## Lo que se deriva y lo que se escribe

| | de dónde sale |
|---|---|
| las marcas, sus vaults y sus raíces | `listSources()` |
| las operaciones, agrupadas por forma | el catálogo de `operations.ts` |
| las tres capas, sus verbos y lo que NO les toca | **escrito** — es la doctrina, no se puede derivar de nada |
| quién manda sobre cada campo | **escrito, en un solo lugar** (`DUENOS` en `src/lib/mapa.ts`) |

Hay un test que **verifica que la vista no escriba a mano lo que ya está
declarado**: falla si el nombre de una marca, la ruta de un vault o el nombre de
una operación aparecen hardcodeados en el componente. Un mapa escrito a mano es
lo primero que queda viejo, y un mapa viejo manda a la capa equivocada con
confianza — que es exactamente el problema que este change existe para resolver.

## La tabla de dueños, una sola vez

La regla dura 3 dice que nunca escriben los dos lados lo mismo. Tener esa tabla
dos veces —en el mapa y en la documentación del puente— garantiza que un día se
separen, y ese día nadie sabría cuál es la buena. Vive en `src/lib/mapa.ts` y
hay tests de que cada campo tiene un dueño único, de que cada uno dice qué pasa
si se toca del lado que no manda, y de que **el estado del kanban es el único que
viaja en los dos sentidos**.

## La mitad que más se olvida

Cada capa declara lo que **NO** le corresponde, y esa columna ocupa tanto espacio
como la de lo que sí hace. Un mapa que solo dice qué hace cada capa no evita
resolver en la equivocada — que es lo que pasó tres veces en dos semanas según el
proposal: el kanban en el vault, las ideas vigiladas por un script después de
mudarse, y trabajos que leen archivos locales agendados en la nube.

La plataforma declara en mayúsculas lo único que no puede hacer nunca:
**escribir o editar el cuerpo de una pieza.** Hay un test de eso.

## Lo que quedó sin hacer

- **3.4 — verificar en ancho de teléfono.** Las tablas van en `overflow-x-auto`
  con ancho mínimo y las tarjetas se apilan por breakpoint, pero eso es una
  expectativa, no una medición en un teléfono real.
- **4.2 — que alguien ajeno lo lea y diga qué no se entiende.** No se puede
  hacer desde acá: necesita una persona que no conozca el proyecto. Es la única
  verificación del change que sigue pendiente de alguien.
