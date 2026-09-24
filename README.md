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
