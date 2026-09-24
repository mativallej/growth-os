# Tasks

> Requiere `footer-contract-parser` cerrado (el lector de footers que esto reusa).

## 1. Arreglar lo que ya está mal (no depende de nada)

- [ ] 1.1 Agregar las cuatro buyer personas faltantes al destino de colaboración: Marcos, Valentina, Emmanuel, Nati. Verifica: las seis disponibles.
- [ ] 1.2 Agregar ronda y ángulo como dimensiones. Verifica: aparecen en el esquema.
- [ ] 1.3 Reescribir `ad_fields` en `scripts/sync-notion.py` para leer del footer en vez de la ruta, incluyendo ronda, ángulo y CTA. Verifica: dry-run sobre los 28 creativos y comparar contra lo que declaran.
- [ ] 1.4 Completar las dimensiones de los 14 creativos ya cargados, que quedaron vacíos al moverlos de tablero.

## 2. El modelo

- [ ] 2.1 Entidad de creativo en `src/lib/types.ts`, **separada de la pieza**. Verifica: test de que un creativo no entra en ninguna colección de piezas.
- [ ] 2.2 `src/lib/ads.ts`: lectura de creativos desde las raíces declaradas, reusando el lector de footers.
- [ ] 2.3 Derivar el conjunto de personas y dolores de la fuente. Verifica: agregar una carpeta de persona nueva y confirmar que aparece sin tocar código.
- [ ] 2.4 Test del creativo que se mueve de carpeta: sus dimensiones no cambian.

## 3. La cobertura

- [ ] 3.1 Rollup de cobertura por persona × dolor × ángulo, incluyendo las combinaciones en cero.
- [ ] 3.2 Vista de cobertura bajo la ruta de marca, con el aviso explícito de que el rendimiento no se mide.
- [ ] 3.3 Revisar la vista con los datos reales: 6 personas contra 28 creativos concentrados. **Si con datos reales parece rota, reescribir cómo se presenta antes de cerrar.**

## 4. Los dos contratos

- [ ] 4.1 Plegar la extensión `[extensión Tegu] Ads — platform: meta-ads` de `tegu-growth/Analytics/Contrato de Footer.md` al canónico `docs/footer-contract.md`. Mismas claves, misma regla de que las derivadas no se escriben.
- [ ] 4.2 Plegar también las otras dos extensiones que la copia marca: resolución de `nonfoll` y normalización de `imp` en Instagram. **`nonfoll` tiene una decisión abierta del humano** anotada en la copia: es derivada y el contrato prohíbe escribir derivadas, pero el código la usa. No resolverla por cuenta propia.
- [ ] 4.3 Dejar la copia de tegu-growth apuntando al canónico en vez de duplicarlo, o documentar por qué se mantienen dos.
- [ ] 4.4 Anotar la pregunta abierta de `spend`: acumulado o ventana. Se responde con el primer export real, no antes.

## 5. Cerrar

- [ ] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 5.2 Confirmar que ninguna vista orgánica cambió sus conteos al incorporar los creativos.
