# Proposal

## Why

El puente con Notion se construyó entre el 2026-09-23 y el 2026-09-24 y está
funcionando: `scripts/sync-notion.py` y `scripts/sync-notion-docs.py`, con los
tableros **Content Creator** (128 filas), **Ads Creator** (14) e **Ideas** (27)
bajo la página Growth.

Pero sus reglas —que se descubrieron rompiéndolas— viven hoy en dos `SKILL.md` y en
un docstring. **Eso no es un contrato, es folclore.** Y los scripts no tienen un solo
test, cuando son lo único del proyecto que **escribe** en los vaults y en Notion.

Las tres reglas se ganaron caro:

1. **Sin señal explícita, Backlog.** La carga inicial puso "En producción" en 51 piezas que en el vault solo tienen `analytics: pendiente`. La columna más importante del tablero quedó ilegible hasta que se corrigieron 45 filas a mano.
2. **Un dueño por campo.** El estado es el único campo que viaja en los dos sentidos: el vault decide con qué estado nace la fila, Notion manda después.
3. **Content Creator no es Ads Creator.** Un ad no se publica: se activa y se pausa, y se organiza por público y dolor, no por canal y fórmula. Los 14 creativos habían caído en el kanban de contenido y hubo que moverlos.

Y hay dos trampas de plataforma que van a volver:

- **Notion guarda el valor de un `select` como texto** y lo resuelve por nombre sin distinguir mayúsculas. Renombrar `tegu`→`Tegu` migró solo; renombrar `mativallej`→`Personal Brand` dejó **57 filas en blanco**. Renombrar una opción sin migrar las filas las vacía.
- **El corte operativo.** Sin él, el primer `--apply` sube 56 piezas de archivo al tablero. El tablero es lo que se mueve, no un archivo.

## What Changes

- Se versiona el contrato del puente como spec, con los casos que hoy solo están en prosa.
- Se agregan tests a los scripts: hoy tienen cero, y son los únicos que escriben.
- Se completa lo que quedó a medio camino: la credencial para correr sin sesión interactiva, la documentación de tegu-growth sin subir, y los campos derivados de los 14 creativos vacíos.

**No incluye:** cuándo corre el puente. Eso es `scheduling-and-alerts`.

## Capabilities

### New Capabilities

- `notion-bridge`: qué se sincroniza entre los vaults y Notion, en qué sentido viaja cada campo, qué se excluye, y qué garantías da antes de escribir.

### Modified Capabilities

*(ninguna — los scripts son independientes de la app)*

## Impact

**Código.** `scripts/sync-notion.py`, `scripts/sync-notion-docs.py` (existen) · `config/sources.json` (existe, con `notion.marca`, `notion.docs`, `notion.ads`, `notion.operational_days`) · tests (nuevos).

**Datos.** Es el único componente que **escribe**: en Notion siempre, y en los `.md` solo el campo de estado. Todo lo demás es read-only.

**Credencial.** Correr sin sesión interactiva necesita un token de integración de Notion, distinto del OAuth del MCP. Sin él, el puente solo puede correrse a mano. Al 2026-09-24 **no está configurado**, así que nada de esto se ejecutó nunca por API: está probado leyendo los vaults y sin escribir.

**Privacidad.** Define qué sale de cada vault: `tegu-growth` completo, el vault personal **solo contenido**, `tegu-docs` nada. La documentación personal y las notas no suben, y eso es una decisión, no un pendiente.
