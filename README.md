# tegu-growth

Centraliza el crecimiento de Tegu (building-in-public + distribución). Arranca como
el dashboard de analytics de X/IG, migrado de Astro a **Next.js 16** (App Router).

> Sucesor de `tegu-x-analytics` (Astro). Misma lógica: lee las piezas `.md` + su
> metadata del vault (`tegu-docs/Brand/Content/**`) y arma el dashboard. **Sin API,
> sin base de datos, sin store.** La fuente de verdad son los `.md`.

## Cómo corre

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # SSG (lee el vault en build)
```

Espera el vault en `../tegu-docs/Brand/Content` (sibling). Override:

```bash
VAULT_CONTENT_DIR=/ruta/a/Brand/Content npm run dev
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
