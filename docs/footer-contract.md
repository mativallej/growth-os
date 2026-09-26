# Contrato de footer

Formato de datos del footer de una pieza de contenido. Vale para los tres vaults — `brain-mativallej` (marca personal), `tegu-docs` y `tegu-growth`. Es la fuente canónica: las skills que escriben footers emiten este formato, el parser de esta app lee este formato, y `scripts/ingest-analytics.py` escribe este formato.

Reconcilia lo que antes eran tres gramáticas distintas y la doctrina previa (`Analytics Ingest — Doctrina.md`), que tenía razón en lo central.

## La regla que lo ordena todo: solo cortes, sin valor "actual"

Las métricas viven **únicamente en líneas de corte**. No hay campos base tipo `- impressions: 374094`.

El motivo se midió el 2026-09-23: al ingerir un export contra el vault aparecieron **19 conflictos que no eran conflictos** — el vault decía `impressions: 48204` porque se midió una vez, y el export decía `54899` porque la pieza siguió creciendo dos meses y medio. Un campo base es un valor que envejece, y después nadie sabe si está viejo o está mal.

Sin campo base no hay ambigüedad: **el valor vigente es el último corte.** Nada que pisar, nada con qué comparar mal.

## El formato

```
<la pieza, verbatim como se publicó>

---

- id: k7m2p9qx
- platform: X
- account: personal
- date: 2026-03-10
- url: https://x.com/mativallej_/status/2031461036541313501
- formula: X1 · storytelling-de-tercero
- status: publicado
- snapshot 2026-03-12 (+2d): imp=121691 eng=28179 pv=1617 likes=810 bmk=278 follows=25
- snapshot 2026-09-22 (+196d): imp=152064 eng=33565 pv=1621 likes=1310 bmk=269 follows=26
- notas: <texto libre, una línea>
```

### Campos de identidad — un dato por línea

Estos no envejecen, así que sí van como campos.

| clave | valores | regla |
|---|---|---|
| `id` | 8 caracteres de `23456789abcdefghjkmnpqrstuvwxyz` | **la identidad de la pieza.** Se asigna una vez y no se reasigna nunca, ni al mover el archivo ni al renombrarlo. Es opaco: no codifica red, fecha ni fórmula. Ver D-9 |
| `platform` | `X` · `LinkedIn` · `Instagram` · `Blog` · `TikTok` | uno solo; los cross-post llevan un archivo por red |
| `account` | id de `config/sources.json` (`mativallej_x`, `tegu_ig`…) | **qué cuenta publicó**, no de qué habla. Una marca puede tener varias cuentas en la misma red |
| `date` | `AAAA-MM-DD` | la fecha sola, sin texto al lado |
| `url` | link al post | **sin esto la pieza no se puede medir**: es la llave del ingest |
| `formula` | código del catálogo + nombre | `X1 · storytelling-de-tercero` · `E · origin story` |
| `status` | `idea` · `draft` · `publicado` | enum cerrado, minúscula |

### Cortes

```
- snapshot <fecha ISO> (+<N><unidad>): k=v k=v …
```

- **Acumulativos, nunca se pisan.** Corte nuevo → línea nueva. Corregir uno → reemplazar solo esa línea.
- **Fecha absoluta Y horizonte.** El horizonte solo (`+56d`) pierde cuándo se midió si cambia la fecha de publicación; la fecha sola obliga a recalcular. Van los dos.
- **Si una métrica no está, se omite la clave.** Nunca `0` de relleno, nunca estimar: un `0` y una ausencia no son lo mismo.
- **Las derivadas no se escriben.** Eng rate, save/like, porcentajes, velocidad: las calcula quien lee.

Claves de los cortes (abreviadas; el lector expande):

| concepto | X / LinkedIn | Instagram |
|---|---|---|
| alcance bruto | `imp` | `views` |
| cuentas alcanzadas | — | `reach` |
| guardados | `bmk` | `saves` |
| respuestas | `replies` | `comments` |

Comunes: `likes` · `rt` · `shares` · `eng` · `pv` · `follows` · `detail` · `clicks`.
LinkedIn: `sends` · `link_eng`. IG: `accounts_engaged` · `link_taps`.

**Las métricas no se colapsan entre redes.** `imp` (X) no es `views` (IG) no es `reach`. Colapsarlas hace que las piezas de IG rankeen en cero en cualquier orden por alcance.

### Texto libre

`notas` · `lectura` · `veredicto` · `hook` · `refs`. Una línea cada uno. Si necesita más, va en el cuerpo.

### El bloque de análisis y su compuerta

`verdict` / `drivers` / `why` / `lesson`. **No se escribe sin OK explícito del humano al verdict**, y no antes de tener cortes suficientes (+24/48h en adelante). El criterio es de la persona: Claude propone y contrasta, el humano decide.

## Tres dimensiones, y ninguna hardcodeada

El sistema escala en tres ejes independientes, y agregar cualquiera es editar config, no código:

| eje | dónde se agrega | qué define |
|---|---|---|
| **n marcas** | `config/sources.json` → `brands[]` | vault, carpeta de contenido, carpeta de data |
| **n cuentas** | `brands[].accounts[]` | red, handle, y `url_contains` para no pisarse con otra cuenta de la misma red en el mismo vault |
| **n redes** | `config/networks.json` → `networks{}` | cómo leer el export: columnas, columna de ID, patrón de ID en la URL, formatos de fecha, y el mapeo de métricas |

Hoy: 2 marcas × 6 cuentas × 3 redes declaradas. **X está completo; Instagram y LinkedIn están declarados como `pendiente`** — sus columnas no se inventaron, faltan exports reales. Si se corre el ingest contra una red pendiente, **falla con un mensaje claro en vez de no hacer nada**.

Nombrar la cuenta en el footer no es burocracia: es lo que permite que dos cuentas de la misma red convivan en un vault y que el ingest sepa cuál es cuál.

## Claves por plataforma

*(Plegado desde `tegu-growth/Analytics/Contrato de Footer.md` el 2026-09-26, donde
vivía como `[extensión Tegu]`. Este es ahora el canónico de las tres cosas que
sumaba: la red `meta-ads`, la resolución de `nonfoll` y la normalización de `imp`
en Instagram.)*

**Las métricas no se colapsan entre redes.** `imp` (X) no es `views` (IG) no es
`reach`. Colapsarlas hace que las piezas de una red rankeen en cero en cualquier
orden por alcance — pasó, y por eso existe `primaryReach` en `src/lib/metrics.ts`.

| plataforma | alcance bruto | propias de la red | estado |
|---|---|---|---|
| **X** | `imp` | `detail` · `rt` · `bmk` · `replies` | ✅ export mapeado |
| **Instagram** | `views` | `reach` · `saves` · `comments` · `accounts_engaged` · `link_taps` | ✅ export mapeado |
| **LinkedIn** | `imp` | `sends` · `link_eng` | ⏸ falta un export real |
| **TikTok** | `views` | `favorites` · `watch_full` · `avg_watch` | ⏸ falta un export real |
| **YouTube Shorts** | `views` | `watch_time` · `avg_view_pct` · `subs` | ⏸ falta un export real |
| **Meta Ads** | `imp` | `reach` · `results` · `spend` · `currency` · `hook_3s` · `plays` | ⏸ falta un export real |

Comunes a todas: `likes` · `shares` · `comments` · `follows` · `clicks` · `eng` · `pv`.

> ⚠️ **Las cuatro `⏸` no tienen claves confirmadas.** Los nombres son la
> intención, no el mapeo: falta un export real de cada plataforma para saber cómo
> se llaman de verdad las columnas. Hasta entonces el ingest **falla con un
> mensaje claro** en vez de inventar nombres — la misma regla de
> `config/networks.json`.

## Meta Ads — un creativo no es un post

Otro ciclo y otras métricas. `spend` **obliga a** `currency` (`ARS`/`USD`): un
número de plata sin moneda no aguanta una auditoría.

**CTR, hook-rate y costo por resultado NO se escriben.** Salen de `clicks/imp`,
`hook_3s/plays` y `spend/results`. *Qué es caro o barato lo decide una persona, no
la fórmula* — misma razón por la que no hay campos base de métrica.

Un creativo además declara sus dimensiones de organización, que un post no tiene:

```
canal: Meta Ads (Instagram/Facebook) · cuenta: metaads_tegu · buyer persona: Diego ·
dolor: 1 (…) · creativo: 1 · ronda: 2 · formato: Imagen · ángulo: Educativo ·
CTA: "…" · estado: Draft
```

| clave | regla |
|---|---|
| `buyer persona` | del framework de la marca. Se lee del footer; la carpeta es el respaldo, y quien lo use registra que derivó |
| `dolor` | número del dolor dentro de esa persona |
| `formato` | `Imagen` · `Carrusel` · `UGC` · `Video` |
| `ángulo` | `Educativo` · `Testimonial` · `Comparación` · `Problema-solución`. El calificativo entre paréntesis es prosa: agrupa el término base |
| `ronda` | la unidad de iteración. Un creativo vive por ronda, no es evergreen |
| `CTA` | el llamado a la acción, textual |

### Dos preguntas abiertas — NO las resuelve el código

- **`spend`: ¿acumulado o de la ventana del corte?** Meta entrega las dos cosas
  según cómo se exporte, y la regla general del contrato ("el valor vigente es el
  último corte") supone acumulado, que para gasto funciona solo si siempre se
  exporta de por vida. **Se responde con el primer export real, no antes.**
- **`nonfoll` (no-seguidores) es una derivada**, y el contrato prohíbe escribir
  derivadas — pero `growth-analytics` y `src/lib/types.ts` la usan hoy. Las
  opciones son guardar los crudos y calcularla, o aceptarla como excepción
  documentada. **Hasta que se decida, no se escribe.** Lo decide Matías.

## Prohibido

- **Campos base de métrica** (`- impressions: 374094`) — envejecen. Es la regla madre de arriba
- **Negrita en la clave**: `- **archivo retroactivo**:` → usar `- notas:`
- **Bullets sin `:`** — si no tiene clave, no es un campo
- **La fecha como clave**: `- 2026-07-16 (+8d): …` → lleva el prefijo `snapshot`
- **Bloques de código cercados dentro del footer**
- **Secciones `#` después del footer** — el footer cierra el archivo
- **Separadores de miles**, `~`, `+`, y todo lo que vaya después de un `(`
- **`PENDIENTE` como valor** — vacío significa desconocido
- **`fórmula` con tilde** conviviendo con `formula`
- **Líneas compuestas** con varias claves separadas por ` · `

## Mapeo desde los formatos viejos

| viejo | nuevo |
|---|---|
| `canal: Twitter` | `platform: X` |
| `cuenta: personal` | `account: personal` |
| `estado: Publicado 2026-07-22` | `status: publicado` + `date: 2026-07-22` |
| `link:` | `url:` |
| `- t=+56d imp=1788 eng=317` | `- snapshot <fecha> (+56d): imp=1788 eng=317` |
| `- impressions: 374094` (campo base) | pasa a ser el corte más viejo conocido |
| `analytics: pendiente` | se borra — vacío es desconocido |

## Migración

Se migra todo lo existente, no solo lo nuevo: si no, el parser tolerante sigue haciendo falta.

1. **Dry-run primero**, con el diff a revisión.
2. **Baseline antes y después**: piezas parseables por vault. No puede bajar.
3. Lo que no se pueda mapear con certeza **no se toca** y se lista aparte.
4. Un commit por vault, reversible.

Orden: **contrato → skills que escriben → archivos.**
