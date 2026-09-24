# Proposal

## Why

Los specs escritos hoy —`piece-model` y `growth-views`— asumen contenido orgánico en
todos lados: modelan canal, fórmula y alcance, y rankean por alcance. **Un creativo de
campaña no tiene fórmula, y rankearlo por alcance es rankearlo por cuánto se gastó.**
Aplicados tal cual, los 28 creativos de `Create/Ads/` entrarían como piezas sin
clasificar y ensuciarían las cuatro vistas.

La doctrina ya existe y no estaba contemplada. `Create/Ads/Framework de Ads.md` lo
dice en una tabla:

| | Posts | Ads |
|---|---|---|
| Se organiza por | Fórmula A-K | Buyer persona × dolor × formato × ángulo |
| KPI | Saves / shares / follows / reach | Hook-rate / CTR / CPA / costo por resultado |
| Voz | Founder, building-in-public | Adaptada a la buyer persona |
| Vida útil | Evergreen | **Por ronda**; se itera con data |

Y `Analytics/Meta/Data/README.md` remata: *"Ads ≠ orgánico: otro ciclo y otras
métricas. Acá pesan costo por resultado/CPA, CTR y hook-rate — no saves ni shares."*

Tres errores concretos de lo hecho el 2026-09-24, que este change corrige:

1. **El tablero de campañas tiene 2 personas de 6.** Se cargaron Sofía y Diego; en el vault hay **Sofía, Marcos, Valentina, Diego, Emmanuel y Nati**. Y no tiene ronda ni ángulo, cuando la ronda es la unidad de iteración y el ángulo una de las cuatro dimensiones de organización.
2. **La sincronización deriva persona y dolor de la ruta del archivo**, cuando el creativo los declara explícitamente: `buyer persona: Sofía (Cliente) · dolor: Dolor 3 - … · ronda: Ronda 1 - Jul 2026 · ángulo: Testimonial · CTA: …`. Leer la ruta es estrictamente peor: se rompe si el archivo se mueve, y no puede capturar ronda, ángulo ni CTA.
3. **Hay dos contratos de footer y solo uno sabe de campañas.** *(Corregido el 2026-09-24: yo había dado por inexistente el contrato de ads. Existe.)* `tegu-growth/Analytics/Contrato de Footer.md` tiene una sección `[extensión Tegu] Ads — platform: meta-ads` que define `imp`, `reach`, `clicks`, `results`, `spend`, `currency`, `hook_3s`, `plays`, y decide bien lo difícil: **CTR, hook-rate y costo por resultado no se escriben porque son derivadas** — *"el que decide qué es caro o barato es Matías, no la fórmula"*. El canónico de este repo, `docs/footer-contract.md`, **no tiene esa sección**, y la copia dice de su propia mano "sincronizar con el canónico cuando alguno cambie", que es un proceso manual que va a derivar. Está marcado `status: draft`.

## What Changes

- **Los creativos dejan de ser piezas.** Entidad propia, con sus dimensiones: buyer persona, dolor, formato, ángulo, ronda, CTA.
- **La unidad de registro es el creativo**: una entrada por creativo. *(Decisión del 2026-09-24. La alternativa —creativo × público— se descarta por ahora porque el framework sostiene que el creativo ES el targeting; si un mismo creativo llega a correr en varios públicos a la vez, este modelo se queda corto y hay que revisarlo.)*
- **Las dimensiones se leen de lo declarado en el creativo**, y solo se derivan de la ubicación cuando el creativo no las declara — registrando la procedencia. *(Medido el 2026-09-24: de 13 creativos, **6 declaran buyer persona en el footer y 7 no**. Negarse a derivar dejaría la mitad de las filas vacías, que es peor que derivar y decirlo.)*
- **Las evaluaciones no son creativos.** Junto a cada creativo puede haber un documento de evaluación; son 13 archivos que no deben generar entrada propia.
- **Vista de cobertura**: qué combinaciones de persona × dolor × ángulo tienen creativo y **cuáles no**. El hueco es el hallazgo, igual que las fórmulas sin estrenar en el lado orgánico.
- Se completan las personas faltantes y se agregan ronda y ángulo en el destino de colaboración.

**No incluye, deliberadamente: ninguna métrica de campañas.** Al 2026-09-24 **ningún
creativo tiene un solo número cargado**: los 13 son briefs. El contrato ya define las
claves, así que no hay nada que inventar — pero sí queda una pregunta abierta que un
export real responde y una especulación no: **si `spend` es acumulado o de la ventana
del corte.** Meta entrega las dos cosas según cómo se exporte, y el contrato general
("el valor vigente es el último corte") supone acumulado, que para gasto funciona solo
si siempre se exporta de por vida. Se resuelve con la primera ronda medida.

**Tarea que sí entra:** plegar la extensión `meta-ads` al contrato canónico de este
repo, para que deje de haber dos documentos que alguien tiene que acordarse de
sincronizar a mano.

## Capabilities

### New Capabilities

- `ads-model`: qué es un creativo de campaña, por qué dimensiones se organiza, cómo se mide su cobertura, y por qué su rendimiento todavía no se modela.

### Modified Capabilities

- `piece-model`: se declara explícitamente que un creativo no es una pieza y no participa de las vistas orgánicas.
- `notion-bridge`: las dimensiones del creativo se leen de lo declarado, no de la ruta.

## Impact

**Código.** `src/lib/ads.ts` (nuevo) · `src/lib/types.ts` (entidad nueva, separada de la pieza) · vista de cobertura bajo la ruta de marca · `scripts/sync-notion.py` (`ad_fields` pasa a leer el footer).

**Datos.** Read-only sobre el vault. En el destino de colaboración: se agregan cuatro personas, ronda y ángulo. Las filas existentes se completan; ninguna se borra.

**Alcance de marca.** Solo Tegu tiene campañas hoy. La marca personal declara cero, y eso no es un pendiente.

**Riesgo.** La vista de cobertura va a mostrar muchos huecos: hay 6 personas y varios dolores por persona, contra 28 creativos concentrados en pocas combinaciones. **Eso es el hallazgo, no un bug** — pero si la vista lo presenta como error de carga, nadie va a actuar sobre lo que está diciendo.

**Deuda declarada.** Mientras no exista el contrato de métricas, la vista SHALL decir que el rendimiento no se está midiendo. Una vista de campañas sin números y sin esa aclaración se lee como "las campañas no funcionaron".
