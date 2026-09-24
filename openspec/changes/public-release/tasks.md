# Tasks

> **Verificado el 2026-09-24: no hay secretos en el historial.** `.env.local` está
> cubierto por `.gitignore` desde siempre, cero commits lo tocan, y ningún archivo
> rastreado contiene webhooks ni tokens. **No hay que reescribir historia.**

## 1. Sacar el espacio de trabajo del código

- [ ] 1.1 Mover los tres identificadores de Notion de `scripts/sync-notion.py` y `scripts/sync-notion-docs.py` a configuración. Verifica: `grep -rE '[0-9a-f]{8}-[0-9a-f]{4}' scripts/` → vacío.
- [ ] 1.2 Error claro si falta un identificador, **antes** de intentar cualquier llamada.
- [ ] 1.3 `config/sources.example.json` completo y comentado, con dos marcas de ejemplo genéricas. Ignorar `config/sources.json` y sacarlo del repo.
- [ ] 1.4 Verificar el arranque en limpio: clonar a otro directorio, no configurar nada, y confirmar que dice qué falta en vez de fallar raro.

## 2. El barrido del OpenSpec — con bisturí

> El criterio: **sale quién, se queda qué pasó.** Si al terminar un `Why` ya no
> explica por qué existe la regla, el barrido se pasó de mano y hay que reescribirlo,
> no borrarlo.

- [ ] 2.1 El contractor externo pasa a describirse por su rol (2 menciones).
- [ ] 2.2 La historia personal sensible se nombra por su función: "contenido personal sensible" (2 menciones). **El requisito de aislamiento entre marcas tiene que seguir siendo igual de contundente.**
- [ ] 2.3 La contratación del equipo se generaliza (2 menciones).
- [ ] 2.4 Las métricas de la empresa se reemplazan por su forma (4 menciones): "una minoría de las piezas tiene métricas" en vez del recuento exacto.
- [ ] 2.5 Releer los once `proposal.md` completos después del barrido. **Cada uno tiene que seguir convenciendo a alguien que no conoce el proyecto.**
- [ ] 2.6 Las buyer personas se quedan: son personajes de un framework, no personas.

## 3. Lo formal

- [ ] 3.1 `LICENSE`. Elegir cuál es decisión del autor.
- [ ] 3.2 `README.md` siguiendo la estructura estándar del autor para repos abiertos (la de `building-in-public-template`). Tiene que responder: qué problema resuelve, qué supone del entorno, qué **no** hace.
- [ ] 3.3 Advertir en el README qué operaciones escriben en los archivos del usuario y cómo previsualizarlas. Los recaudos existen; hay que decirlos.
- [ ] 3.4 `CONTRIBUTING.md`, con el flujo de OpenSpec: los cambios entran por un change, no por un PR suelto.
- [ ] 3.5 `package.json`: `tegu-growth` → el nombre definitivo.
- [ ] 3.6 Remote y nombre del repositorio. Ver D-13.

## 4. Antes de publicar

- [ ] 4.1 Barrido final sobre **todo** el árbol rastreado, no solo el OpenSpec: `docs/`, `scripts/`, `config/`, `CLAUDE.md`, `AGENTS.md`.
- [ ] 4.2 Confirmar una vez más que ningún archivo rastreado tiene webhooks, tokens ni rutas de terceros.
- [ ] 4.3 Que alguien ajeno al proyecto lea el README y diga qué no se entiende. Anotar acá qué cambió después.
