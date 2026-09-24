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

- [ ] 1.1 Crear la integración en Notion, compartirle la página Growth, y poner el token en `.env.local` (gitignored, `chmod 600`). Verifica: `python3 scripts/sync-notion.py --brand mativallej --scope posts` no corta por falta de token.
- [ ] 1.2 Primera corrida real en dry-run de las dos marcas y los tres alcances. Anotar acá los conteos.

## 2. Los tests que no tiene

- [ ] 2.1 Tests de `estado_post` y `estado_ad`: sin señal → conservador; con url → publicado; con "pendiente grabar" → en curso; con "no publicar aún" → conservador. **Es la regla que ya se rompió una vez.**
- [ ] 2.2 Test de la lectura de las dos gramáticas, con un caso de prosa que no debe entrar como metadato (`Detrás de todo esto: +150 builds`).
- [ ] 2.3 Test del corte operativo, incluido el caso de una pieza publicada **sin fecha** — no se esconde, es deuda visible.
- [ ] 2.4 Test de que el dry-run no escribe: correr contra un vault de prueba y verificar que no hay diff.
- [ ] 2.5 Test de que una pieza que desapareció del vault se reporta como huérfana y su fila no se toca.

## 3. Lo que quedó a medias

- [ ] 3.1 Subir la documentación de tegu-growth (~68 archivos: Foundations, Learn, Marketing, Brand/Identity, UI & UX, Analytics). Verifica: segunda corrida sin cambios, por el hash.
- [ ] 3.2 Llenar público, persona, dolor y formato de los 14 creativos, que quedaron vacíos al moverlos entre tableros. Salen del path.
- [ ] 3.3 Sincronizar las piezas nuevas que aparecieron desde la carga inicial.

## 4. La deuda conocida del diseño

- [ ] 4.1 Decidir qué hacer cuando una pieza **se mueve** de carpeta: hoy la llave es la ruta relativa, así que se ve como fila nueva. Dejar escrita la decisión, aunque sea "se acepta".

## 5. Cerrar

- [ ] 5.1 Correr los tests y dejar acá el resultado.
- [ ] 5.2 Confirmar que las dos skills (`brain-notion-sync`, `growth-notion-sync`) describen lo que el código hace, no lo que queríamos que hiciera.
