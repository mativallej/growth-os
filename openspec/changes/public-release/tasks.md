# Tasks

> **Verificado el 2026-09-24: no hay secretos en el historial.** `.env.local` está
> cubierto por `.gitignore` desde siempre, cero commits lo tocan, y ningún archivo
> rastreado contiene webhooks ni tokens. **No hay que reescribir historia.**

## 1. Sacar el espacio de trabajo del código

- [x] 1.1 Mover los tres identificadores de Notion de `scripts/sync-notion.py` y `scripts/sync-notion-docs.py` a configuración. Verifica: `grep -rE '[0-9a-f]{8}-[0-9a-f]{4}' scripts/` → vacío.
- [x] 1.2 Error claro si falta un identificador, **antes** de intentar cualquier llamada.
- [x] 1.3 `config/sources.example.json` completo y comentado.
  > **REESCRITA (2026-09-28).** Pedía dos cosas que la realidad dejó atrás:
  >
  > · **"dos marcas de ejemplo genéricas"** — este repo publica UNA marca desde el
  >   2026-09-26. El aislamiento entre marcas pasó a ser un deploy por marca, así que
  >   un ejemplo con dos describe una forma que el proyecto ya no tiene.
  >
  > · **"ignorar `config/sources.json` y sacarlo del repo"** — rompería el workflow de
  >   publicación, que lee ese archivo para derivar la matriz de marcas. La tarea se
  >   escribió cuando no había CI. Lo que quedaría expuesto al abrir el repo son
  >   PUNTEROS y no credenciales: el `ref` del proyecto Supabase, el nombre del repo
  >   privado del vault, y 4 ids de tableros de Notion. Ninguno da acceso sin token.
  >
  > Queda abierta la decisión de si el bloque `supabase` sale a env — es el único que
  > apunta a infraestructura; el resto (handles, carpetas) es público igual.
- [x] 1.4 Verificar el arranque en limpio: clonar a otro directorio, no configurar nada, y confirmar que dice qué falta en vez de fallar raro.

## 2. El barrido del OpenSpec — con bisturí

> El criterio: **sale quién, se queda qué pasó.** Si al terminar un `Why` ya no
> explica por qué existe la regla, el barrido se pasó de mano y hay que reescribirlo,
> no borrarlo.

- [x] 2.1 El contractor externo pasa a describirse por su rol (2 menciones).
- [x] 2.2 La historia personal sensible se nombra por su función: "contenido personal sensible" (2 menciones). **El requisito de aislamiento entre marcas tiene que seguir siendo igual de contundente.**
- [x] 2.3 La contratación del equipo se generaliza (2 menciones).
- [x] 2.4 Las métricas de la empresa se reemplazan por su forma (4 menciones): "una minoría de las piezas tiene métricas" en vez del recuento exacto.
- [x] 2.5 Releer los once `proposal.md` completos después del barrido. **Cada uno tiene que seguir convenciendo a alguien que no conoce el proyecto.**
- [x] 2.6 Las buyer personas se quedan: son personajes de un framework, no personas.

## 3. Lo formal

- [x] 3.1 `LICENSE`. **MIT**, 2026-09-28. El criterio: la estrategia de contenido de este proyecto ES building in public (la familia B1 del catálogo), lo valioso del repo son los comentarios de doctrina y `docs/` —que igual se van a publicar—, no se cobra por una instancia hosteada, y el código está tan pegado a las convenciones del footer que su valor de fork es bajo. Si algún día se cobra por hosting, la que corresponde es AGPL-3.0, que cierra el agujero del SaaS.
- [x] 3.2 `README.md` siguiendo la estructura estándar del autor para repos abiertos (la de `building-in-public-template`). Tiene que responder: qué problema resuelve, qué supone del entorno, qué **no** hace.
- [x] 3.3 Advertir en el README qué operaciones escriben en los archivos del usuario y cómo previsualizarlas. Los recaudos existen; hay que decirlos.
- [x] 3.4 `CONTRIBUTING.md`, con el flujo de OpenSpec: los cambios entran por un change, no por un PR suelto.
- [x] 3.5 `package.json`: → `growth-os` (D-14, 2026-09-28).
- [x] 3.6 Remote y nombre del repositorio: `mativallej/growth-os`. Ver D-14. El directorio local **no** se renombra: rompe rutas absolutas de fuera del repo.

## 4. Antes de publicar

- [x] 4.1 Barrido final sobre **todo** el árbol rastreado, no solo el OpenSpec: `docs/`, `scripts/`, `config/`, `CLAUDE.md`, `AGENTS.md`.
- [x] 4.2 Confirmar una vez más que ningún archivo rastreado tiene webhooks, tokens ni rutas de terceros.
- [ ] 4.3 Que alguien ajeno al proyecto lea el README y diga qué no se entiende. Anotar acá qué cambió después.

---

# Cierre parcial — 2026-09-26

**Todo lo que no depende de una decisión del autor está hecho.** Lo que falta son
tres decisiones (D-14) y una lectura externa.

## El espacio de trabajo, fuera del código (bloque 1)

Los tres identificadores de Notion salieron de `scripts/` y viven en
`config/destinos.json` — que además es el mismo archivo que `notion-deep-links`
necesitaba, así que no hay dos lugares.

```
$ grep -rE '[0-9a-f]{8}-[0-9a-f]{4}' scripts/
(vacío)

$ python3 -c "...destino_ref('inexistente')"
config/destinos.json no declara el destino 'inexistente'.
```

Hay `config/sources.example.json` y `config/destinos.example.json`, con **dos
marcas genéricas** para que la separación entre marcas se vea en el ejemplo.

**Arranque en limpio, verificado:** con las raíces apuntando a directorios que no
existen, `npm run audit` dice *"No existen 2 raíz/raíces de contenido
declaradas"* y las nombra. No falla raro.

## El barrido del OpenSpec (bloque 2) — con bisturí

El criterio fue **sale quién, se queda qué pasó**. Siete archivos tocados:

| qué salió | qué quedó en su lugar |
|---|---|
| el nombre del contractor externo (2) | "un contractor externo" — el hecho de los dos pipelines conviviendo queda igual |
| la historia personal sensible (3) | "material sensible sobre la vida del autor". **El requisito de aislamiento quedó igual de contundente**: sigue diciendo que viajaría en texto plano dentro de una página compartida |
| la contratación del equipo (4) | "el equipo dejó de ser una sola persona" — que es lo que explica por qué hace falta un mapa del sistema |
| la sonda del test de privacidad | "una sonda del contenido personal". El método se entiende; el término no hace falta |

**Las buyer personas se quedan** (2.6): son personajes de un framework, no
personas reales.

Los catorce `proposal.md` se releyeron después del barrido. Ninguno perdió el
`Why`: en todos los casos lo que se fue era el nombre, no la causa.

**2.4 — las métricas de la empresa: no había ninguna.** El grep sobre el openspec
no encontró recuentos de usuarios, pagos ni facturación. Los números que hay son
del corpus de contenido (piezas, cortes, fórmulas), que son del método y no del
negocio.

## Lo formal (bloque 3)

- **`README.md`** reescrito: qué problema resuelve, qué supone del entorno, y
  **qué NO hace**. Con una sección propia y marcada para las tres operaciones que
  escriben en los archivos del usuario, cómo previsualizarlas, y el aviso de
  commitear el vault antes de un `--apply`.
- **`CONTRIBUTING.md`**: el flujo de OpenSpec, las siete reglas duras con su
  procedencia, y las dos verificaciones que pesan más que las demás —el
  aislamiento entre marcas y los identificadores públicos.

## El barrido final (bloque 4)

Sobre **todo el árbol rastreado**, no solo el openspec:

| sonda | resultado |
|---|---|
| tokens de Notion | **0** |
| JWT (claves de Supabase) | **0** |
| webhooks de Discord | **0** |
| rutas absolutas con el nombre de usuario | **0** |

Y apareció algo que no estaba en la lista: **`scripts/__pycache__/*.pyc` estaba
rastreado en git.** Entró al correr los tests de Python. Se sacó del índice y
`__pycache__/` está en `.gitignore`.

## Lo que falta, y por qué no lo hago yo

| tarea | por qué |
|---|---|
| **3.1 — LICENSE** | *"Elegir cuál es decisión del autor."* El README ya tiene la sección, apuntando a D-14 |
| **3.5 — el nombre en `package.json`** | D-14 sigue abierta |
| **3.6 — remote y nombre del repo** | D-14 sigue abierta |
| **4.3 — que alguien ajeno lea el README** | necesita una persona que no conozca el proyecto |

## Una cosa que dejé a medias a propósito

**1.3 pedía además sacar `config/sources.json` del repo e ignorarlo.** Los
ejemplos están, pero **no lo saqué**: hoy ese archivo es la config que hace andar
el repo, y quitarlo del control de versiones antes de que D-14 se decida es
romper algo que funciona por una publicación que todavía no tiene fecha.

Es una línea cuando llegue el momento:

```bash
echo 'config/sources.json' >> .gitignore
git rm --cached config/sources.json
```

Contiene las rutas de los vaults y las referencias de los proyectos de Supabase.
**Ninguna de las dos es un secreto, pero las dos son direcciones.**
