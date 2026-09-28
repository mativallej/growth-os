# growth-os

La capa de **medición** del growth de una marca, construida sobre un vault de
Obsidian.

Lee los `.md` del vault, los cruza contra el catálogo de fórmulas, y responde lo
que un tablero de coordinación no puede: cuánto se publicó contra el objetivo,
qué se publicó sin medir, **qué fórmula nunca se estrenó**, y qué combinación de
campaña no tiene un solo creativo.

## El problema que resuelve

Si coordinás contenido en un tablero y lo escribís en archivos, tenés los datos
partidos y ninguna mitad responde lo que importa:

- El **tablero** sabe qué está en qué carril, y no tiene el histórico ni el
  catálogo. Una fórmula que nunca se usó no tiene fila en ninguna base: solo
  aparece cruzando el catálogo contra lo publicado.
- Los **archivos** tienen la verdad y no la cruzan con nada.

Esta app es el nexo. No reemplaza a ninguna de las dos.

## Qué supone de tu entorno

- **Los `.md` son la fuente de verdad.** No hay base de datos y no va a haber.
- **Un vault es UNA marca**, y es un repo de git en disco, referenciado por un symlink estable
  (`~/vaults/<nombre>`). Nunca por la ruta real: un vault renombrado rompe toda
  ruta hardcodeada en silencio, y eso ya pasó.
- **Cada pieza tiene un footer** después del último `---`. Las dos gramáticas
  —un dato por línea, o varios separados por ` · `— se leen las dos, más el
  bloque `distribucion:`. Ver [`docs/footer-contract.md`](docs/footer-contract.md).
- Node 22+. Python 3 solo para el backfill de ids.

## Qué NO hace

- **No escribe ni edita contenido.** Ni el cuerpo de una pieza, ni una idea, ni
  nada: desde el 2026-09-26 esta app no tiene un solo campo de texto libre, y hay
  un test que compara el conjunto exacto de módulos que escriben en disco — son
  tres, y los tres escriben configuración del repo.
- **No duplica el tablero de coordinación.** Si una vista se resuelve allá, va allá.
- **No sincroniza con Notion.** Eso vive en el repo del vault, que es donde está
  el contenido y de donde sale el disparador.
- **No corre sola.** Ninguna operación es agendada ni diferida.
- **No afirma causalidad, no fija umbrales y no define objetivos.** El objetivo de
  cadencia y el umbral de viralidad se DECLARAN en `config/`; derivarlos del
  promedio garantizaría no estar nunca por debajo de ellos.

## Arrancar

```bash
npm install
cp config/sources.example.json config/sources.json     # tu marca y su vault
cp config/destinos.example.json config/destinos.json   # tu tablero, si usás uno
npm run audit                                          # read-only: qué ve el parser
npm run dev                                            # → / y /<marca>
```

Si una raíz de contenido no existe, **el build se cae nombrándola**. Es a
propósito: un dashboard que muestra cero cuando no encontró nada parece
información.

### Las credenciales

`.env.local` (git lo ignora). Lo mínimo para arrancar es Clerk:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_…
CLERK_SECRET_KEY=sk_…
```

El resto —Notion, Supabase, las rutas de los vaults— se edita desde
`/configuracion`, que existe en desarrollo y **no se compila** en un build que se
publica. Ver [`docs/deploy.md`](docs/deploy.md).

## Las vistas

| | |
|---|---|
| `/` | saludo y la marca de este build |
| `/<marca>` | overview, filtrable por red, fórmula, cobertura y estado |
| `/<marca>/inventario` | todas las piezas en tres vistas: tabla, métricas y tablero |
| `/<marca>/cadencia` | publicado por semana, mes, trimestre o año contra la dieta |
| `/<marca>/deuda` | publicado sin medir, y los creativos sin ronda, en tablas que no se suman |
| `/<marca>/formulas` | uso del catálogo, con las que nunca se estrenaron |
| `/<marca>/ranking` | por métrica, en absoluto y en tasa |
| `/<marca>/campanas` | cobertura persona × ángulo, donde los filtros recalculan la matriz |
| `/<marca>/piezas/<slug>` | una pieza: su cuerpo en Markdown, sus cortes, y dónde se publicó |

## ⚠️ Lo único que escribe en tu vault

```bash
python3 scripts/backfill-piece-id.py --brand <marca>    # dry-run
python3 scripts/backfill-piece-id.py --brand <marca> --apply
```

Escribe un `id` en el footer de cada pieza que no lo tiene. **Aborta si el vault
tiene cambios sin commitear**, y no es una precaución: se intentó una vez contra
un vault que otra sesión estaba reorganizando, y las 14 escrituras estaban
muertas minutos después.

Los scripts del sync con el tablero se mudaron a **`tegu-labs/tegu-growth`** el
2026-09-26: el disparador de un sync es que cambió el contenido, y el contenido
está allá.

> El contrato del footer quedó **espejado en los dos repos**. `KNOWN_KEYS` de
> `src/lib/footer.ts` y `CLAVES` de `sync-notion.py` tienen que decir lo mismo.
> Agregar una clave es tocar los dos: si se toca uno solo, ninguno falla.

## Publicar

```bash
npm run build
```

**Una instalación es una marca** (D-17): `growth-os` es el código, y cada marca lo
instala apuntando a su vault y a su base. Las instalaciones no se conocen entre sí.

El workflow verifica antes de subir que la marca declarada, el vault clonado y el
proyecto de Supabase configurado sean el mismo — un secret mal puesto mandaría el
deploy de una marca contra los datos de otra, y eso no lo pesca ningún test porque
es configuración y no código. El gate de sesión vive en `src/proxy.ts`. Todo en
[`docs/deploy.md`](docs/deploy.md).

## Cómo está organizado

| | |
|---|---|
| `src/lib/` | el parser, los rollups y los modelos. Puro, testeado |
| `src/app/[account]/` | las vistas, una ruta por marca |
| `src/app/configuracion/` | solo local: `.local.tsx` no entra en `pageExtensions` sin la variable |
| `config/` | marca, redes, destinos y umbrales. Agregar una marca es agregar un objeto |
| `docs/` | los contratos: [footer](docs/footer-contract.md) · [atribución](docs/attribution.md) · [método](docs/metodo.md) · [deploy](docs/deploy.md) |
| `openspec/` | por qué cada cosa es como es |

## Contribuir

Los cambios entran por un change de OpenSpec. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

MIT — ver [LICENSE](LICENSE).

**Cubre el código de este repositorio y nada más.** El contenido vive en los
vaults, que son repositorios aparte: acá no hay una sola pieza. La licencia no
dice nada sobre los `.md` de nadie.
