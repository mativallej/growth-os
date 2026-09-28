# Tasks

> **Sesiones del 2026-09-23 y 24 — el puente está construido y corriendo a mano.**
>
> Construido: `scripts/sync-notion.py` (alcances posts/ads/docs/all, pregunta si no
> se le dice, dry-run por defecto, corte operativo de 60 días, lee las dos
> gramáticas de footer) y `scripts/sync-notion-docs.py` (espejo de documentación,
> un solo sentido, estado en `.state/`). Config en `config/sources.json`.
>
> En Notion: Content Creator (128 filas, estados corregidos contra el vault), Ads
> Creator (14 creativos movidos del kanban de contenido), Ideas (27), vistas board
> por marca en los dos tableros.
>
> **Tres bugs que costaron caro, anotados porque van a volver:** el lector entendía
> una sola gramática y veía 14 piezas de Tegu donde hay 95; el renombre de la
> etiqueta de marca vació 57 filas porque Notion guarda el select como texto; y sin
> corte operativo el primer `--apply` subía 56 piezas de archivo.
>
> **Nada de esto se ejecutó nunca por API**: todo se hizo con el MCP a mano. Falta
> la credencial.

## 1. La credencial

- [x] 1.1 Crear la integración en Notion, compartirle la página Growth, y poner el token en `.env.local` (gitignored, `chmod 600`). Verifica: `python3 scripts/sync-notion.py --brand mativallej --scope posts` no corta por falta de token.
- [ ] 1.2 Primera corrida real en dry-run de las dos marcas y los tres alcances. Anotar acá los conteos.

## 2. Los tests que no tiene

- [x] 2.1 Tests de `estado_post` y `estado_ad`: sin señal → conservador; con url → publicado; con "pendiente grabar" → en curso; con "no publicar aún" → conservador. **Es la regla que ya se rompió una vez.**
- [x] 2.2 Test de la lectura de las dos gramáticas, con un caso de prosa que no debe entrar como metadato (`Detrás de todo esto: +150 builds`).
- [x] 2.3 Test del corte operativo, incluido el caso de una pieza publicada **sin fecha** — no se esconde, es deuda visible.
- [x] 2.4 Test de que el dry-run no escribe: correr contra un vault de prueba y verificar que no hay diff.
- [x] 2.5 Test de que una pieza que desapareció del vault se reporta como huérfana y su fila no se toca.
  > **MUDADA a `tegu-labs/tegu-growth` (2026-09-26).** Los scripts del sync se fueron a ese repo, porque el disparador de un sync es que cambió el contenido y el contenido está allá. La tarea no está hecha: dejó de ser de ESTE repositorio.

## 3. Lo que quedó a medias

- [ ] 3.1 Subir la documentación de tegu-growth (~68 archivos: Foundations, Learn, Marketing, Brand/Identity, UI & UX, Analytics). Verifica: segunda corrida sin cambios, por el hash.
- [ ] 3.2 Llenar público, persona, dolor y formato de los 14 creativos, que quedaron vacíos al moverlos entre tableros. Salen del path.
- [ ] 3.3 Sincronizar las piezas nuevas que aparecieron desde la carga inicial.

## 4. La deuda conocida del diseño

- [x] 4.1 Decidir qué hacer cuando una pieza **se mueve** de carpeta: hoy la llave es la ruta relativa, así que se ve como fila nueva. Dejar escrita la decisión, aunque sea "se acepta".

## 5. Cerrar

- [x] 5.1 Correr los tests y dejar acá el resultado.
- [ ] 5.2 Confirmar que las dos skills (`brain-notion-sync`, `growth-notion-sync`) describen lo que el código hace, no lo que queríamos que hiciera.

---

# Cierre parcial — 2026-09-26

**219 tests de vitest + 23 de Python.** Los de Python son nuevos: el puente no
tenía uno solo, y corre sin `node_modules`, así que sus tests también
(`python3 scripts/test_sync_notion.py`, enganchado a `npm test`).

## La credencial (tarea 1.1) — hecha

La integración `growth-loop` existe, el token está en `.env.local` (gitignored,
`chmod 600`) y **el script ya no corta por falta de token**.

## Dos bugs, y el primero tapaba al segundo

**1. La versión de la API no coincidía con los endpoints.** El script declaraba
`Notion-Version: 2022-06-28` y consulta `/v1/data_sources/<id>/query`, que existe
desde `2025-09-03`. Notion respondía `invalid_request_url` — un error que **parece
de ruta mal armada** y manda a revisar los ids, cuando el problema era la versión.

Corregido en los dos scripts. Con la versión correcta la respuesta cambia a
`object_not_found`, que es el problema real.

**2. El 404 no se leía.** El mensaje de Notion dice exactamente qué falta
—*"Make sure the relevant pages and databases are shared with your integration"*—
pero enterrado en 400 caracteres de JSON. Ahora un 401/403/404 imprime los pasos
concretos para compartir la página, que es lo que el spec pide: *mensaje, no traza*.

## Los tests que no tenía (bloque 2)

| qué fija | por qué importa |
|---|---|
| `estado_post` sin señal → **Backlog** | la regla que ya se rompió: el 2026-09-23 puso "En producción" en 51 piezas que el vault no marcaba |
| `no publicar aún` → Backlog | contiene "publicar" Y "pendiente": si cualquiera de los dos ganara, una pieza que pide NO salir aparecería como lista |
| una `url` es evidencia dura | y una `url` que dice "pendiente" no lo es |
| `estado_ad`: pausado gana sobre activo | un ad no se publica, se activa y se pausa |
| las dos gramáticas de footer | el bug que hacía ver 14 piezas de Tegu donde hay 95 |
| prosa que parece metadato | `Detrás de todo esto: +150 builds` NO entra |
| corte operativo | y una pieza **publicada sin fecha NO se esconde**: es deuda visible |
| el dry-run no escribe | se corre contra un vault de prueba y se compara tamaño y mtime de cada archivo |

De paso apareció un bug chico: `read_piece` no cerraba el archivo que abría.

## La deuda de diseño (tarea 4.1) — resuelta, no aceptada

La tarea pedía decidir qué hacer cuando una pieza se mueve de carpeta, *"aunque
sea 'se acepta'"*. **No se aceptó: se resolvió.** `stable-piece-id` le dio a cada
pieza un id propio, el puente llavea por él, y la ruta quedó como dato
informativo que se actualiza cuando la pieza se mueve. Una mudanza dejó de ser
una fila nueva.

## Lo que sigue bloqueado, y ahora se sabe exactamente por qué

**Falta compartir la página Growth con la integración.** Notion lo dice con todas
las letras y el script ahora lo traduce a pasos. Hasta eso:

- **1.2** — la primera corrida real en dry-run de las dos marcas y los tres alcances
- **2.5** — el test de la pieza huérfana, que necesita filas existentes contra las que comparar
- **3.1, 3.2, 3.3** — subir la documentación, llenar los 14 creativos y sincronizar lo nuevo

Lo que sí se pudo medir del lado del vault: el corte operativo deja fuera **57
piezas de la marca personal** y **31 de Tegu**, y el barrido de ads excluye **19
archivos** por no ser creativos.

## Tarea 5.2 — sin hacer

Las skills `brain-notion-sync` y `growth-notion-sync` viven en los vaults, y los
vaults tienen cambios sin commitear. No se tocan desde acá.
