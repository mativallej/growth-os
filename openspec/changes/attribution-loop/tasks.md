# Tasks

> Requiere `footer-contract-parser` (el identificador estable) y se apoya en
> `operations-console` para la operación de generar el enlace. La vista de deuda sale
> de `growth-views`.

## 1. La convención

- [x] 1.1 Fijar la forma del enlace rastreable, con el identificador de la pieza como valor único por pieza. Escribirla en `docs/` una sola vez y que el código la lea de ahí.
- [x] 1.2 Verificar la unicidad sobre el corpus completo de las dos marcas. Verifica: test de que no hay dos piezas con el mismo identificador de atribución.
- [x] 1.3 Decidir dónde queda el enlace en la pieza y anotarlo en el contrato de footer. **No inventar una clave nueva sin revisar las que ya existen.**

## 2. Generar

- [x] 2.1 `src/lib/attribution.ts`: construcción del enlace a partir de la pieza. Función pura. Verifica: test de determinismo — dos llamadas, el mismo enlace.
- [x] 2.2 Operación en el catálogo: el enlace de una pieza, y el de un lote filtrado.
  > **OBSOLETA (2026-09-28).** El catálogo de operaciones se borró con `/operar` el 2026-09-26, al volver esto un visualizador que se deploya. `enlaceRastreable` también se fue; está en el historial. La doctrina sigue en `docs/attribution.md`.
- [x] 2.3 Caso Instagram: el enlace no puede ir en el cuerpo del post, va en bio o en story. Anotar la consecuencia — es el canal donde más se pierde el clic.

## 3. Las tres señales

- [x] 3.1 Vista con las tres separadas, y el estado de cada una (disponible / no disponible).
- [x] 3.2 La regla de que ninguna se presenta sola. Verifica: test de que la vista no rinde una señal única.
- [x] 3.3 Distinguir "no se está midiendo" de "cero conversiones". **Es el requisito que más fácil se rompe y el que más caro sale.**

## 4. La deuda

- [x] 4.1 Estado "no atribuible" en la vista de deuda, distinto de "sin métricas".
- [x] 4.2 Contar cuántas piezas publicadas quedarían hoy como no atribuibles y anotarlo acá. Es la línea de base.

## 5. Lo que falta del otro lado (no es de este repo)

- [x] 5.1 Dejar escrito, en un solo lugar, qué tiene que hacer el producto: persistir primer y último toque, emitirlos con el registro, y el campo abierto de "¿cómo nos conociste?".
- [x] 5.2 Mientras eso no exista, la vista tiene que decir que el circuito está abierto. **No mostrar ceros.**
- [ ] 5.3 Abrir la conversación sobre el campo auto-reportado: es lo más barato de toda la lista y lo único que ve el boca a boca.

## 6. Cerrar

- [x] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 6.2 Releer el riesgo interpretativo del proposal antes de mostrarle el primer número a alguien.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **232 tests de vitest + 23 de Python** · la vista
está en `/[account]/atribucion`.

## La convención, escrita una sola vez (tarea 1.1)

`docs/attribution.md`. El código la lee de ahí y no la repite.

```
<destino>?utm_source=<red>&utm_medium=organico&utm_campaign=<marca>&utm_content=<id de pieza>
```

**`utm_content` es el `id` del footer (D-9), NO el slug**, y este es el motivo:

> Un enlace rastreable **ya publicado no se puede corregir**: vive en un tweet de
> hace ocho meses. Si su llave sale de la ruta y la ruta cambia, el dato no se
> rompe — **miente**, y apunta a otra pieza.

El slug queda como respaldo mientras el backfill no haya corrido, y cuando se usa
**queda marcado** (`deId: false`), para poder contar cuántos enlaces salieron con
llave frágil.

### Dónde vive (tarea 1.3)

En el campo **`url` que el contrato ya tiene**. No se inventó una clave nueva: el
footer ya distingue la url del post publicado de los destinos que empuja, y una
`utm_url` sería un tercer lugar donde buscar la misma cosa.

El enlace **se genera al publicar y no se persiste**: es derivable, y persistir
una derivada es lo que el contrato de footer prohíbe.

## La unicidad, verificada sobre el corpus real (tarea 1.2)

`clavesRepetidas(loadPieces())` sobre las dos marcas: **0 repetidas**. Hay un
test que corre contra los vaults reales, no contra fixtures.

## Las tres señales, y lo que NO hacen

| señal | estado hoy |
|---|---|
| Atribuida por clic | **sin medir** — el producto no persiste el origen de un registro |
| Auto-reportada | **sin medir** — no existe el campo de "¿cómo nos conociste?" |
| Serie temporal | **sin medir** — no hay export de registros por día |

**Ninguna se presenta como un cero.** Es estructural, no una decisión de la
vista: una señal no disponible **no tiene campo `valor`**, así que no hay un cero
que mostrar aunque alguien quisiera. Hay un test de eso.

Es el requisito que el proposal marca como el que más fácil se rompe y más caro
sale, y tiene razón: un cero en una vista de atribución, cuando el circuito está
abierto, es la clase de número que hace cancelar un canal que funcionaba.

**Ninguna se presenta sola** — también estructural: `senales()` devuelve siempre
las tres, no hay forma de pedir una.

Y las discrepancias entre ellas se declaran **información, no errores**: si el
clic dice 3 y el auto-reportado dice 20, esas 17 personas llegaron por un camino
que el clic no ve.

## La línea de base (tarea 4.2)

| | publicadas | no atribuibles | con llave frágil |
|---|---|---|---|
| tegu | 80 | **0** | **80** |
| personal | 20 | **0** | **20** |

Las 100 son técnicamente atribuibles —todas declaran canal— pero **las 100 con
llave frágil**, porque el backfill de ids no corrió todavía. Ese es el número
que importa: cada enlace que se publique antes del backfill sale con una llave
que puede envejecer.

## El caso Instagram (tarea 2.3)

Instagram no permite un enlace clickeable en el cuerpo de un post: va en bio o en
story. **Es el canal donde más clic se pierde**, y su atribución por clic va a
subestimar sistemáticamente. Consecuencia aceptada y escrita: en Instagram la
señal auto-reportada no es un complemento, es la principal.

## Lo que falta del otro lado (bloque 5)

Escrito en un solo lugar (`docs/attribution.md`) y repetido en la vista:

1. Persistir **primer y último toque por separado** — son dos preguntas
   distintas: qué lo trajo y qué lo convenció.
2. Emitirlos con el registro.
3. El campo abierto de **"¿cómo nos conociste?"**, que es lo más barato de toda
   la lista y **lo único que ve el boca a boca** — el WhatsApp, que en Argentina
   es probablemente la mitad del descubrimiento real y hoy es invisible.

Mientras no existan, la vista **dice que el circuito está abierto** y lo pone
primero, antes que cualquier número.

## Lo que quedó sin hacer

- **2.2 — la operación en el catálogo** ("dame el link de esta pieza"). La
  función pura está y tiene tests; falta declararla como operación de la consola
  con su parámetro de destino. Es lo más chico que falta.
- **5.3 — abrir la conversación sobre el campo auto-reportado.** Es una
  conversación con el equipo de producto, no algo que se resuelva acá.
