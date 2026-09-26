# Tasks

> Requiere `footer-contract-parser` cerrado (el lector de footers que esto reusa).

## 1. Arreglar lo que ya está mal (no depende de nada)

- [ ] 1.1 Agregar las cuatro buyer personas faltantes al destino de colaboración: Marcos, Valentina, Emmanuel, Nati. Verifica: las seis disponibles.
- [x] 1.2 Agregar ronda y ángulo como dimensiones. Verifica: aparecen en el esquema.
- [x] 1.3 Reescribir `ad_fields` en `scripts/sync-notion.py` para leer del footer en vez de la ruta, incluyendo ronda, ángulo y CTA. Verifica: dry-run sobre los 28 creativos y comparar contra lo que declaran.
- [ ] 1.4 Completar las dimensiones de los 14 creativos ya cargados, que quedaron vacíos al moverlos de tablero.

## 2. El modelo

- [x] 2.1 Entidad de creativo en `src/lib/types.ts`, **separada de la pieza**. Verifica: test de que un creativo no entra en ninguna colección de piezas.
- [x] 2.2 `src/lib/ads.ts`: lectura de creativos desde las raíces declaradas, reusando el lector de footers.
- [x] 2.3 Derivar el conjunto de personas y dolores de la fuente. Verifica: agregar una carpeta de persona nueva y confirmar que aparece sin tocar código.
- [x] 2.4 Test del creativo que se mueve de carpeta: sus dimensiones no cambian.

## 3. La cobertura

- [x] 3.1 Rollup de cobertura por persona × dolor × ángulo, incluyendo las combinaciones en cero.
- [x] 3.2 Vista de cobertura bajo la ruta de marca, con el aviso explícito de que el rendimiento no se mide.
- [x] 3.3 Revisar la vista con los datos reales: 6 personas contra 28 creativos concentrados. **Si con datos reales parece rota, reescribir cómo se presenta antes de cerrar.**

## 4. Los dos contratos

- [x] 4.1 Plegar la extensión `[extensión Tegu] Ads — platform: meta-ads` de `tegu-growth/Analytics/Contrato de Footer.md` al canónico `docs/footer-contract.md`. Mismas claves, misma regla de que las derivadas no se escriben.
- [ ] 4.2 Plegar también las otras dos extensiones que la copia marca: resolución de `nonfoll` y normalización de `imp` en Instagram. **`nonfoll` tiene una decisión abierta del humano** anotada en la copia: es derivada y el contrato prohíbe escribir derivadas, pero el código la usa. No resolverla por cuenta propia.
- [x] 4.3 Dejar la copia de tegu-growth apuntando al canónico en vez de duplicarlo, o documentar por qué se mantienen dos.
- [x] 4.4 Anotar la pregunta abierta de `spend`: acumulado o ventana. Se responde con el primer export real, no antes.

## 5. Cerrar

- [x] 5.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 5.2 Confirmar que ninguna vista orgánica cambió sus conteos al incorporar los creativos.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **172 tests** · build de 319 páginas.

## Lo medido, que no coincide con lo que decía el proposal

El proposal hablaba de 28 creativos y 13 evaluaciones. Al 2026-09-26 el vault
tiene **36 `.md` en `Create/Ads`: 17 creativos, 17 evaluaciones y 2 de doctrina**
(framework y mapa de rondas). Los conteos de abajo son los medidos hoy.

| | |
|---|---|
| creativos | **17** |
| buyer personas declaradas en carpetas | **6** (Sofía, Marcos, Valentina, Diego, Emmanuel, Nati) |
| personas **con** creativos | **2** — Sofía y Diego |
| ángulos | 4 (Comparación, Educativo, Problema-solución, Testimonial) |
| combinaciones persona × dolor × ángulo sin creativo | **62 de 72** |

## Las dos cosas que hacían la matriz ilegible

1. **`Sofía` y `Sofía (Cliente)` eran dos personas.** El paréntesis de la persona
   trae el público, no un matiz: ahora se extrae de ahí —que es leer lo
   declarado— y la persona queda en su término base.
2. **8 ángulos donde hay 4.** El vault escribe `Educativo`,
   `Educativo (marco general)` y `Educativo (pregunta)` para el mismo ángulo. Se
   agrupa por el término base y el crudo se conserva en `anguloRaw`.

Sin esas dos, la cuadrícula tenía la mitad de las columnas con una sola celda
ocupada — y una grilla que parece vacía porque está mal agrupada esconde
exactamente el hueco que existe para mostrar.

## El universo sale de las carpetas, no de los creativos

Si saliera de los creativos, **las 4 personas sin producir no aparecerían** — y
esas cuatro son el hallazgo. `adUniverse()` lee
`<público>/<persona>/<Dolor N - …>/` del vault: agregar una carpeta de persona la
hace aparecer sin tocar una línea de código, y hay un test que lo verifica.

## La vista, reescrita antes de cerrar (tarea 3.3)

Persona × dolor × ángulo da **72 celdas con 62 en cero**, y eso se lee como un
error de la app. La vista muestra **persona × ángulo** (24 celdas) más los
dolores cubiertos por persona, y **lidera con "4 de 6 buyer personas sin un solo
creativo"**. El total de combinaciones vacías queda como dato al pie.

El aviso de que **esto es cobertura y no rendimiento** va arriba y es parte del
dato: ningún creativo tiene números cargados —son briefs— y las métricas que
importan en ads son derivadas que el contrato no escribe.

## Los dos contratos, plegados (tareas 4.1–4.4)

`docs/footer-contract.md` ahora es el canónico también de lo que vivía como
`[extensión Tegu]` en `tegu-growth/Analytics/Contrato de Footer.md`: la tabla de
claves por plataforma, la sección de Meta Ads y las dimensiones del creativo.

**Las dos preguntas abiertas quedaron escritas SIN resolver, a propósito:**

- **`spend`: acumulado o ventana.** Se responde con el primer export real.
- **`nonfoll` es una derivada** que el contrato prohíbe y el código usa. Lo decide
  Matías; hasta entonces no se escribe.

**La copia de tegu-growth no se tocó.** El vault tiene cambios sin commitear y no
se fuerza una escritura ahí. Queda pendiente reemplazar su cuerpo por un puntero
al canónico — es una edición de una línea cuando el vault esté quieto.

## `ad_fields` de sync-notion.py

Ya leía del footer (se había arreglado el 2026-09-24, al revés de lo que decía la
tarea). Se le sumó lo que faltaba: el **CTA**, y sacar el **público del paréntesis
de la persona** antes de caer a la carpeta.

**No se pudo verificar contra Notion**: la integración no tiene la página Growth
compartida, así que el dry-run corta con un 400. Lo que sí coincide es el
universo — el script reporta **19 archivos excluidos por no ser creativos** y
`ads.ts` excluye los mismos 19.

## Aislamiento (tarea 5.2)

Los conteos orgánicos **no se movieron**: 141 piezas de Tegu y 154 personales,
iguales que antes de sumar los creativos. `Create/Ads` ya estaba en el `ignore`
de la fuente, y hay un test que verifica que ningún creativo se cuela en
`loadPieces` ni en los vaults reales.

## Lo que quedó sin hacer

- **1.1 y 1.4 — las cuatro personas faltantes y las dimensiones de los 14
  creativos ya cargados** en el destino de colaboración. Las dos escriben en
  Notion y están bloqueadas por la página sin compartir.
