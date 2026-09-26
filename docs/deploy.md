# Publicar

Cómo sale esto a internet, y qué protege cada pieza.

## La forma: un deploy por marca

No es una preferencia de infraestructura, es la **regla dura 4** hecha
infraestructura: las marcas no se mezclan.

```
tegu-distribution ──┬── GROWTH_SOURCES=tegu ──→ proyecto Vercel "tegu"
                    │                            contiene: /tegu/*
                    │                            0 bytes de cualquier otra marca
                    │
                    └── (otra marca) ────────→ su propio proyecto Vercel
```

Un externo entra a un deploy donde la otra marca **no existe**: no está
escondida, no se compiló. `GROWTH_SOURCES` hace que `generateStaticParams` no
emita sus rutas, y `dynamicParams = false` que tampoco se fabriquen bajo demanda
—eso último fue un agujero real: el 2026-09-26 `/personal/piezas` devolvía 200 y
servía el vault personal leído en el momento.

La alternativa, un deploy con todas las marcas y un chequeo de rol por ruta,
convierte el aislamiento en un `if`. Un bug en ese `if` filtra contenido de otra
marca. Acá no hay `if` que pueda fallar, porque no hay qué filtrar.

**`.github/workflows/publicar.yml` lo verifica antes de subir nada**: que no se
haya emitido ninguna ruta de otra marca, y que ningún chunk de cliente nombre
una. Lo segundo no es paranoia — así se filtró `/operar` una vez, con la ruta
escrita en el bundle aunque la condición fuera falsa.

## Las dos capas, y cuál es la que protege

| capa | qué hace | qué pasa si falla |
|---|---|---|
| **el build** | la otra marca no está en los archivos | nada que filtrar |
| **`src/proxy.ts`** | ninguna respuesta sale sin sesión | el contenido de ESTA marca queda expuesto |

**El gate es el proxy, no la UI.** Las páginas están prerenderizadas: el
contenido de los `.md` ya está dentro del HTML y del payload RSC. Un
`<Show when="signed-in">` esconde la interfaz y sirve los bytes igual. El chequeo
tiene que pasar antes de que la respuesta salga.

Por eso este repo tampoco se publica como export estático: `output: 'export'` no
soporta Proxy, y un export estático de esto **es el vault publicado**.

Y por eso `<ClerkProvider>` no va en el layout raíz: ahí vuelve dinámicas las diez
rutas de contenido, y con eso se pierde que el deploy no necesite los vaults. Vive
en islas de cliente (`SesionControles`, `Saludo`, las pantallas de sign-in).

## Lo que hay que configurar una vez

### En Clerk

1. **Restrictions → Sign-up mode: `Restricted`.** Sin esto cualquiera con el link
   se registra solo. Con esto, la allowlist decide.
2. **Allowlist**: los mails o dominios que pueden entrar. Empieza vacía a
   propósito — nadie entra hasta que agregues a alguien.
3. Las pantallas de entrar son locales (`/sign-in`, `/sign-up`), no el Account
   Portal de Clerk. Pedirle a alguien que ponga su mail en un dominio que no
   reconoce tiene la forma exacta de un phishing.

### Secrets del repositorio

| secret | para qué | si falta |
|---|---|---|
| `VAULT_TOKEN` | clonar el vault, que vive en otro repo y a veces en otra org | el build no arranca |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | la sesión en el navegador | el login no carga |
| `CLERK_SECRET_KEY` | la verificación en el proxy | nadie puede entrar |
| `VERCEL_TOKEN` · `VERCEL_ORG_ID` | subir | build y verificación corren; no se sube |
| `VERCEL_PROJECT_ID_<marca>` | uno **por marca** | ídem |
| `NOTION_TOKEN` | el diff a Notion | el job de sync no hace nada y lo dice |

`VERCEL_PROJECT_ID` va por marca a propósito: con un solo proyecto, el último
deploy pisaría al anterior y las dos marcas terminarían en la misma URL.

## El sync: por qué no corre solo

La **regla dura 6** es que nada corre solo, y acá no es purismo. Un sync
*escribe*: el 2026-09-23 uno puso «En producción» en 51 piezas que el vault no
marcaba y dejó ilegible la columna que más importa. Un push a `main` no debería
poder repetir eso.

Así que el job corre **siempre en dry-run** —para que el diff quede publicado y
se pueda mirar— y **aplica solo** cuando alguien dispara el workflow a mano
marcando la casilla `aplicar_sync`.

### Lo que el workflow NO hace, y por qué

- **No sincroniza Supabase.** No hay qué sincronizar: ningún script del repo
  escribe a Supabase. Está declarado en `config/sources.json` como índice
  derivado (D-15/D-16) y la pantalla de configuración prueba la conexión, pero el
  índice no existe todavía. Un paso vacío daría un tilde verde por un trabajo que
  nadie hizo.
- **No ingiere analytics.** `ingest-analytics.py` necesita un CSV exportado a mano
  de Meta o de X. Eso no puede pasar en CI.
- **No compila la consola.** `GROWTH_CONSOLE` no se define en ningún lado del
  workflow, y sin esa variable `page.local.tsx` no entra en `pageExtensions`:
  `/configuracion` no existe en el deploy. No está escondida — no hay ruta.

## Probar el aislamiento a mano

```bash
GROWTH_SOURCES=tegu npm run build
GROWTH_SOURCES=tegu npm start

# Sin sesión, todo tiene que redirigir y no servir nada:
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/tegu/inventario   # 307
curl -s localhost:3000/tegu/inventario | grep -c 'alguna-sonda-del-vault'  # 0

# Y el payload RSC también, que es el contenido en otro formato:
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/tegu/inventario.rsc  # 307
```

El `.rsc` es el que se escapa con el matcher corto que circula por ahí —el que
excluye «todo lo que tenga un punto»—. El de `src/proxy.ts` excluye estáticos por
extensión conocida justamente para no dejarlo pasar.
