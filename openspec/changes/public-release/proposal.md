# Proposal

## Why

El proyecto pasa a ser open source. Hoy no lo está y no está listo.

**La buena noticia primero, medida el 2026-09-24:** no hay ningún secreto
comprometido. `.env.local` está cubierto por `.gitignore` (`.env*.local`), **nunca
entró al historial** (0 commits lo tocan), y ningún archivo rastreado contiene
webhooks ni tokens. No hace falta reescribir historia.

Lo que sí falta es todo lo formal y algo de fondo.

**Lo formal.** Sin `LICENSE`, sin `CONTRIBUTING`, `package.json` todavía se llama
`tegu-growth`, y el remote apunta a un repositorio de la organización de la empresa.

**Lo técnico.** Tres identificadores del espacio de trabajo de Notion están escritos
a mano en el código (`scripts/sync-notion.py`, `scripts/sync-notion-docs.py`). Para
cualquiera que no sea el autor, el proyecto no arranca: escribiría en un Notion
ajeno. Y `config/sources.json` es la configuración real del autor —dos marcas
concretas, sus rutas, sus cuentas—, no un ejemplo.

**Lo de fondo, que es lo que requiere criterio.** El OpenSpec de este repo es su
mejor documentación *precisamente por lo específico que es*. Las reglas duras
convencen porque traen su cicatriz: *"se midió el 2026-09-23, 51 piezas con el
estado inventado"*, *"el lector veía 14 piezas donde hay 95"*. Un spec que dice "hay
que manejar bien los errores" no le sirve a nadie; uno que dice qué se rompió y qué
costó, sí.

Pero esa misma especificidad incluye, medido sobre el OpenSpec actual:

| Qué | Menciones | Criterio |
|---|---|---|
| Nombre real de un contractor externo | 2 | **sale** — es una persona, y el contexto es una evaluación de su trabajo |
| Historia personal sensible del autor | 2 | **sale** — se describe por su función, no por su contenido |
| La contratación de una persona del equipo | 2 | **sale** |
| Métricas reales de la empresa | 4 | **sale** — decisión del dueño de esos números |
| Buyer personas | 16 | se queda — son personajes ficticios de un framework |
| Rutas y nombre del autor | 9 | se queda — es su repo |

## What Changes

- **Sanear el OpenSpec conservando la evidencia.** Un tercero se describe por su rol, no por su nombre. Una historia sensible se nombra por su función ("contenido personal sensible") en vez de por su contenido. Los números de la empresa se reemplazan por su forma ("una minoría de las piezas tiene métricas") o se quitan. **Lo que no se toca es el mecanismo del error ni lo que costó**, que es de donde sale el valor.
- **Los identificadores del espacio de trabajo salen del código** y pasan a configuración.
- **`config/sources.json` se convierte en ejemplo**; la configuración real del autor deja de estar en el repo.
- **README, licencia y guía de contribución.** El README siguiendo la estructura estándar del autor para repos abiertos.
- **`package.json` y el remote** al nombre definitivo.

**No incluye:** reescribir el historial de git. No hace falta — no hay nada
comprometido —, y reescribirlo rompería los enlaces de todos los commits que los
specs citan como evidencia.

## Capabilities

### New Capabilities

- `public-release`: qué puede y qué no puede estar en el repositorio público, cómo se arranca el proyecto sin la configuración del autor, y cómo se conserva el valor de la documentación sin exponer a terceros.

### Modified Capabilities

- `content-sources`: la configuración real deja de estar versionada; se versiona un ejemplo.
- `notion-bridge`: los identificadores del destino dejan de estar en el código.

## Impact

**Código.** `config/sources.example.json` (nuevo) · `config/notion.json` o equivalente para los identificadores (nuevo) · `scripts/sync-notion*.py` (dejan de tener constantes) · `.gitignore` · `package.json`.

**Documentación.** `README.md`, `LICENSE`, `CONTRIBUTING.md` · barrido del OpenSpec.

**Riesgo principal, y no es el que parece.** No es filtrar un secreto: eso está
controlado y verificado. Es **vaciar los specs al sanearlos.** Si el barrido se hace
con miedo, quedan once documentos que dicen generalidades y el proyecto pierde lo
único que lo distingue de cualquier otro dashboard de contenido. El criterio tiene
que ser quirúrgico: sale quién, se queda qué pasó.

**Riesgo secundario.** Publicar una herramienta que opera sobre vaults locales
implica que alguien la va a correr contra los suyos. Los recaudos que ya existen
—dry-run por defecto, nunca borrar, fallar si falta una raíz— dejan de ser higiene
propia y pasan a ser responsabilidad hacia terceros. Conviene decirlo en el README en
vez de asumir que se lee el código.

**Lo que este repo le ofrece a alguien más.** Vale la pena tenerlo claro antes de
escribir el README: no es un dashboard. Es **una capa de operación de growth sobre
vaults de Obsidian**, con un contrato de footer para métricas, un puente hacia un
destino de colaboración con un dueño por campo, y la separación entre contenido
orgánico y campañas. El research que originó el proyecto encontró que esa superficie
unificada no existe en el mercado: hay gestores sociales y hay analítica de producto,
y nada que cosa un vault de archivos con las dos cosas.
