# growth-loop

La capa de operación y medición del growth de dos marcas que no se fusionan:
`tegu` (la empresa) y la marca personal. Arranca como el dashboard de analytics de
X/IG, migrado de Astro a **Next.js 16** (App Router).

> Sucesor de `tegu-x-analytics` (Astro). Misma lógica: lee las piezas `.md` + su
> metadata de los vaults de Obsidian y arma el dashboard. **Sin API, sin base de
> datos, sin store.** La fuente de verdad son los `.md`.

## Cómo corre

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # SSG (lee los vaults en build)
npm test         # vitest
npm run audit    # auditoría read-only de las fuentes
```

## La consola de operaciones

```bash
GROWTH_CONSOLE=1 npm run dev     # y después http://localhost:3000/operar
```

El catálogo de operaciones (`src/lib/operations.ts`) con sus botones: captar una
idea, ingerir un export, sincronizar contenido o documentación, subir creativos de
una ronda, el digest. Cada una muestra sus precondiciones y hace cuánto corrió.

**La app no ejecuta lo que escribe.** Prepara la operación, escribe el contexto en
`.state/handoff-*.md` y se lo entrega a una sesión local, donde una persona revisa
la previsualización y decide si aplicar. Lo único que la app guarda por su cuenta es
una idea que alguien acaba de tipear: el contenido lo aportó la persona, no hay nada
que revisar.

**La consola no existe fuera del entorno local.** Sin `GROWTH_CONSOLE=1` sus
archivos (`*.local.tsx`) no entran en `pageExtensions`, así que Next ni los
reconoce como rutas: no hay ruta, no hay manejador, y nada de lo que importan entra
al bundle. No se llega por link desde el dashboard justamente para que el build
compartido no lleve ni la URL escrita.

## De dónde sale el contenido

Las fuentes se declaran en `src/lib/sources.ts` sobre `config/sources.json` — el
mismo archivo que leen los scripts de Python. Las raíces son **absolutas**, vía
`~/vaults/<nombre>`, nunca relativas al directorio desde el que se corre.

**Si una raíz declarada no existe, el build rompe.** Es deliberado: antes
`fg.sync` sobre un directorio inexistente devolvía `[]` y el dashboard buildeaba
vacío sin decir nada. Un artefacto que muestra cero cuando no encontró nada parece
información.

| env var | qué reapunta |
|---|---|
| `VAULT_TEGU_DIR` | la raíz del vault de Tegu (default `~/vaults/tegu-growth`) |
| `VAULT_PERSONAL_DIR` | la raíz del vault personal (default `~/vaults/brain`) |
| `VAULT_CONTENT_DIR` | alias retrocompatible: un content root de Tegu, pisa el declarado |
| `GROWTH_SOURCES` | CSV de fuentes que entran al build (default: todas) |

```bash
GROWTH_SOURCES=tegu npm run build   # solo Tegu
```

## Estructura

```
src/
  app/            Rutas (App Router): overview (/), piezas, piezas/[slug], inventario
  components/     DashboardNav (sidebar), PageHeader, *Client (filtros interactivos)
    ui/           Primitivas shadcn (badge, button, card, input, separator, table)
  lib/            parse (lee el vault), metrics, charts, types, utils
```

Los datos se cargan en RSC (server) con `fs`/fast-glob al buildear; las páginas con
filtro (inventario, piezas) delegan el estado a un client component (`useState`).

## Pendiente (post-migración)

- Alinear el design system a `@tegu` (Tailwind 4 + tokens `--tg-*`) — hoy porta el
  tema Tailwind 3 del dashboard tal cual (paridad primero).
- Consolidar acá la distribución del registry `@tegu` + `@tegu/tokens`.
- Deploy (Vercel): setear `VAULT_CONTENT_DIR` con el contenido disponible en build.
