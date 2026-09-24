# Tasks

> Requiere `footer-contract-parser` (el identificador estable) y se apoya en
> `operations-console` para la operación de generar el enlace. La vista de deuda sale
> de `growth-views`.

## 1. La convención

- [ ] 1.1 Fijar la forma del enlace rastreable, con el identificador de la pieza como valor único por pieza. Escribirla en `docs/` una sola vez y que el código la lea de ahí.
- [ ] 1.2 Verificar la unicidad sobre el corpus completo de las dos marcas. Verifica: test de que no hay dos piezas con el mismo identificador de atribución.
- [ ] 1.3 Decidir dónde queda el enlace en la pieza y anotarlo en el contrato de footer. **No inventar una clave nueva sin revisar las que ya existen.**

## 2. Generar

- [ ] 2.1 `src/lib/attribution.ts`: construcción del enlace a partir de la pieza. Función pura. Verifica: test de determinismo — dos llamadas, el mismo enlace.
- [ ] 2.2 Operación en el catálogo: el enlace de una pieza, y el de un lote filtrado.
- [ ] 2.3 Caso Instagram: el enlace no puede ir en el cuerpo del post, va en bio o en story. Anotar la consecuencia — es el canal donde más se pierde el clic.

## 3. Las tres señales

- [ ] 3.1 Vista con las tres separadas, y el estado de cada una (disponible / no disponible).
- [ ] 3.2 La regla de que ninguna se presenta sola. Verifica: test de que la vista no rinde una señal única.
- [ ] 3.3 Distinguir "no se está midiendo" de "cero conversiones". **Es el requisito que más fácil se rompe y el que más caro sale.**

## 4. La deuda

- [ ] 4.1 Estado "no atribuible" en la vista de deuda, distinto de "sin métricas".
- [ ] 4.2 Contar cuántas piezas publicadas quedarían hoy como no atribuibles y anotarlo acá. Es la línea de base.

## 5. Lo que falta del otro lado (no es de este repo)

- [ ] 5.1 Dejar escrito, en un solo lugar, qué tiene que hacer el producto: persistir primer y último toque, emitirlos con el registro, y el campo abierto de "¿cómo nos conociste?".
- [ ] 5.2 Mientras eso no exista, la vista tiene que decir que el circuito está abierto. **No mostrar ceros.**
- [ ] 5.3 Abrir la conversación sobre el campo auto-reportado: es lo más barato de toda la lista y lo único que ve el boca a boca.

## 6. Cerrar

- [ ] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 6.2 Releer el riesgo interpretativo del proposal antes de mostrarle el primer número a alguien.
