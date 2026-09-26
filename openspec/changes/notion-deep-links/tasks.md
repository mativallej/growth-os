# Tasks

> Change chico. La parte 1 no depende de nada; la parte 2 necesita que la
> sincronización haya corrido al menos una vez con `--apply`.

## 1. Los destinos del workspace

- [x] 1.1 Llevar las direcciones de los destinos a configuración, junto con los identificadores que `public-release` tarea 1.1 saca del código. **Un solo lugar para los dos.**
- [x] 1.2 Accesos en la interfaz, omitiendo los no configurados. Verifica: borrar un destino de la config y confirmar que su acceso desaparece, sin enlace muerto.

## 2. La correspondencia

- [ ] 2.1 `scripts/sync-notion.py` guarda ruta → identificador de registro en `.state/`, tanto al crear como al reconocer uno existente. Verifica: correr con `--apply` y confirmar que el archivo se escribe.
- [ ] 2.2 Confirmar que un dry-run **no** modifica la correspondencia guardada.
- [x] 2.3 Verificar que ningún `.md` quedó tocado por esto: `git -C <vault> status --short` sin cambios.
- [ ] 2.4 Guardar cuándo se actualizó, para poder mostrar la antigüedad.

## 3. Los enlaces por pieza

- [x] 3.1 `src/lib/notion-links.ts`: leer la correspondencia y resolver el enlace de una pieza. Función pura sobre el estado leído.
- [x] 3.2 Enlace en la vista de pieza cuando hay correspondencia; aviso de "sin sincronizar" cuando no. Verifica: test de las dos ramas.
- [x] 3.3 Mostrar la antigüedad de la correspondencia donde se usan los enlaces.
- [x] 3.4 Test de que un enlace nunca apunta al registro de otra marca.

## 4. Cerrar

- [x] 4.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 4.2 Borrar `.state/` y confirmar que la app sigue funcionando sin enlaces, sin errores.

---

# Cierre — 2026-09-26

`tsc` · `lint` (0 errores) · **219 tests** · las 9 vistas responden 200.

## Un solo lugar para los identificadores (tarea 1.1)

Estaban hardcodeados **dos veces**: `CONTENT_DS` y `ADS_DS` en
`scripts/sync-notion.py`, y `GROWTH_PAGE` en `scripts/sync-notion-docs.py`. Dos
copias de un id es una que se va a quedar vieja.

Ahora viven en `config/destinos.json`, que leen los tres: la app
(`src/lib/destinos.ts`) y los dos scripts. **Es el mismo archivo que
`public-release` tarea 1.1 necesita** para sacarlos del código antes de abrir el
repo: un id de workspace no es un secreto, pero es la dirección de la casa de
alguien.

Verificado: los dos scripts siguen resolviendo el id correcto desde la config —
el 400 que devuelven es el acceso de Notion, y el id del mensaje de error
coincide con el declarado.

## Los accesos (tarea 1.2)

Van en la vista del mapa, que es donde se explica qué es cada capa. **Un destino
sin dirección configurada NO se ofrece**: un acceso a un enlace muerto es peor
que no tener el acceso. Hay un test de eso, y otro de que `Ads Creator` —que es
solo de Tegu— no aparece en la marca personal.

## La correspondencia pieza → fila

`scripts/sync-notion.py` ahora guarda `.state/notion-links-<marca>.json`, y
**recoge los ids de las filas que YA existen**, no solo de las que crea. Ese era
el bug de fondo: el puente veía el id de cada fila existente en cada corrida y lo
tiraba.

Se llavea por el **`id` de la pieza (D-9)**, no por su ruta. La ruta cambia, y es
lo que dejó 57 filas apuntando al vacío.

`guardar_enlaces` **no hace nada sin `--apply`** (tarea 2.2): si un dry-run
modificara la correspondencia, mirar sin aplicar dejaría enlaces a filas que
nunca se crearon.

## El enlace por pieza (bloque 3)

En la vista de detalle, con la antigüedad de la correspondencia en el título del
enlace. Y **la distinción que importa**: cuando no hay fila conocida, la vista
dice *"sin fila conocida en el tablero"*, no *"no está sincronizada"*. Que esta
app no sepa cuál es su fila no es lo mismo que que la pieza no esté allá —
afirmar lo segundo sería afirmar de más.

**Un enlace nunca apunta a la fila de otra marca** (tarea 3.4): el archivo de
correspondencia es por marca, así que la de la otra ni se carga. Dos piezas con
la misma clave en marcas distintas no se pueden cruzar, y hay un test.

## Verificaciones

| tarea | resultado |
|---|---|
| 2.3 — ningún `.md` tocado | los `.md` modificados en los vaults son de antes de esta sesión |
| 4.2 — sin `.state/` la app sigue andando | se borró y el build pasó, sin errores y sin enlaces |

## Lo que quedó bloqueado

**2.1 y 2.4 — verificar que el archivo se escribe al correr con `--apply`.** El
código está escrito y el dry-run confirma que no escribe; lo que falta es correr
un `--apply` real, y eso necesita que la página Growth esté compartida con la
integración. Sigue sin estarlo.
