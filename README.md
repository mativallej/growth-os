# growth-loop

La capa de operación y medición del growth de varias marcas que **no se
fusionan**, construida sobre vaults de Obsidian.

Lee los `.md` de cada vault, cruza lo que dicen contra el catálogo de fórmulas, y
responde las preguntas que un tablero de coordinación no puede responder: cuánto
se publicó contra el objetivo, qué se publicó sin medir, **qué fórmula nunca se
estrenó**, y qué combinación de campaña no tiene un solo creativo.

## El problema que resuelve

Si coordinás contenido en un tablero (Notion, Linear, lo que sea) y lo escribís
en archivos, tenés los datos partidos en dos y ninguna de las dos mitades
responde lo que importa:

- El **tablero** sabe qué está en qué carril, y no tiene el histórico ni el
  catálogo. Una fórmula que nunca se usó no tiene fila en ninguna base: solo
  aparece cruzando el catálogo contra lo publicado.
- Los **archivos** tienen la verdad y no la cruzan con nada.

Esta app es el nexo. No reemplaza a ninguna de las dos.

## Qué supone de tu entorno

- **Los `.md` son la fuente de verdad.** No hay base de datos y no va a haber.
- **Cada vault es un repo de git** en disco, referenciado por un symlink estable
  (`~/vaults/<nombre>`). Nunca por la ruta real: un vault renombrado rompe toda
  ruta hardcodeada en silencio, y eso ya pasó.
- **Cada pieza tiene un footer** después del último `---`, con sus metadatos y
  sus cortes de métricas. Las dos gramáticas —un dato por línea, o varios
  separados por ` · `— se leen las dos. Ver `docs/footer-contract.md`.
- Node 22+, y Python 3 de librería estándar para los scripts operativos.

## Qué NO hace

- **No escribe ni edita el cuerpo de una pieza.** Eso es el vault, con sus
  agentes. Lo único que la app escribe de contenido es captar una idea, que es
  materia prima. Hay un test que lo verifica.
- **No duplica el tablero de coordinación.** Si una vista se puede resolver allá,
  va allá.
- **No corre sola.** Ninguna operación es agendada ni diferida: la dispara una
  persona, que ve el resultado en el momento.
- **No afirma causalidad, no fija umbrales y no define objetivos.** Junta la
  evidencia y la muestra separada.

## Arrancar

```bash
npm install
cp config/sources.example.json config/sources.json     # tus marcas y sus vaults
cp config/destinos.example.json config/destinos.json   # tu tablero, si usás uno
npm run audit                                          # read-only: qué ve el parser
npm run dev                                            # → /<marca>
```

Si una raíz de contenido no existe, **el build se cae nombrándola**. Es a
propósito: un dashboard que muestra cero cuando no encontró nada parece
información.

## ⚠️ Las operaciones que escriben en tus archivos

Una cosa de este repo puede modificar tu vault, y es **dry-run por defecto**:

| script | qué escribe | cómo previsualizarlo |
|---|---|---|
| `scripts/backfill-piece-id.py` | un `id` en el footer de cada pieza que no lo tiene | corré sin `--apply` |

**Aborta si el vault tiene cambios sin commitear**, y no es una precaución: se
intentó una vez contra un vault que otra sesión estaba reorganizando, y las 14
escrituras estaban muertas minutos después.

Los scripts del sync con el tablero —`sync-notion.py`, `sync-notion-docs.py`,
`reconciliar-llaves.py`— **se mudaron a `tegu-labs/tegu-growth`** el 2026-09-26.
El disparador de un sync es que cambió el contenido, y el contenido está allá.

**Commiteá tu vault antes de correr cualquiera con `--apply`**, y revisá el diff
allá antes de quedártelo.

## La pantalla de configuración

Las credenciales, las conexiones, qué cuenta como viral en cada red, y agregar o
quitar vaults. **No existe fuera del entorno local**: su archivo usa una
extensión que solo entra en `pageExtensions` con la variable puesta, así que en
un build compartido no hay ruta ni manejador.

```bash
npm run dev:local     # → /configuracion
```

> La consola de operaciones (`/operar`) se quitó el 2026-09-26. Una pantalla que
> abre sesiones y ejecuta comandos en la máquina no puede vivir en algo que se
> deploya con autenticación, y mantener dos modos del mismo producto costaba más
> que mover esas operaciones a los scripts y a CI.

## Compartir un build sin compartirlo todo

```bash
GROWTH_SOURCES=<una marca> npm run build
```

El build resultante **no emite las rutas de las otras marcas**, no sirve su
contenido bajo demanda y no lleva su configuración. Está verificado con tests y
con sondas sobre el output, no deducido.

## Cómo está organizado

| | |
|---|---|
| `src/lib/` | el parser, los rollups y los modelos. Puro, testeado |
| `src/app/[account]/` | las vistas, una ruta por marca |
| `scripts/` | las operaciones, en Python de librería estándar |
| `config/` | marcas, redes y destinos. Agregar una marca es agregar un objeto |
| `docs/` | los contratos: footer y atribución |
| `openspec/` | por qué cada cosa es como es |

## Contribuir

Los cambios entran por un change de OpenSpec. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

> **Pendiente.** Ver `openspec/DECISIONS.md`, D-14.
