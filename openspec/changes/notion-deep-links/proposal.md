# Proposal

## Why

Hoy ir de una pieza a su fila en el destino de colaboración es a mano: abrir Notion,
buscar por título, esperar que el título no se haya renombrado. Y al revés, saber si
una pieza **está** sincronizada requiere mirar el tablero.

Es el hueco más chico de todo el proyecto y el que más veces por día se toca. Las tres
capas existen —vault, destino, plataforma— y la plataforma es el nexo declarado; un
nexo que no enlaza a las otras dos capas está incompleto.

Hay dos niveles, y el segundo es el que tiene diseño:

1. **Los destinos del workspace** — los dos tableros, las ideas, las páginas de documentación. Son cuatro enlaces fijos y hoy no están en ninguna parte de la interfaz.
2. **Cada pieza a su fila.** Acá está el problema: **la plataforma no sabe qué fila le corresponde a una pieza.** El puente conoce el identificador de la fila en el momento de crearla y lo descarta.

## What Changes

- Los destinos del workspace quedan accesibles desde la interfaz, leídos de configuración.
- **Se guarda el mapeo pieza → fila**, y la plataforma lo usa para enlazar.
- Una pieza sin fila muestra que no está sincronizada, **no un enlace roto**.
- El mapeo declara su antigüedad, porque puede quedar viejo.

**La decisión de diseño: el mapeo NO va en el vault.** Tentaba escribir el enlace en
el footer —es un dato por pieza, y ahí viven los datos por pieza—, y se descarta por
dos razones:

- **Dueño de campo.** Hoy el único campo que viaja del destino al vault es el estado del kanban. Agregar un segundo abre la puerta a que el vault empiece a acumular artefactos de una herramienta externa, y un `.md` tiene que seguir siendo legible sin ella.
- **Reversibilidad.** Si mañana el destino cambia, un mapeo en `.state/` se borra; doscientos footers con enlaces muertos hay que limpiarlos a mano.

El mapeo vive del lado de la plataforma, se refresca cuando corre la sincronización
—que ya conoce los identificadores— y es descartable por definición.

**No incluye: el enlace inverso**, del destino a la plataforma. Hoy la plataforma
corre en local, así que una dirección local en una fila compartida no le sirve a otra
persona. Tiene sentido recién si existe un deploy compartido (D-12), y entonces es
media línea.

## Capabilities

### New Capabilities

- `notion-links`: cómo se navega entre la plataforma y el destino de colaboración, dónde vive esa correspondencia y qué pasa cuando falta o queda vieja.

### Modified Capabilities

- `notion-bridge`: la sincronización pasa a registrar la correspondencia que hoy descarta.

## Impact

**Código.** `src/lib/notion-links.ts` (nuevo) · el mapeo en `.state/` · `scripts/sync-notion.py` lo escribe · enlaces en la vista de pieza y en la navegación.

**Datos.** Nada nuevo en los vaults. El mapeo es estado local descartable.

**Privacidad.** Un enlace de una pieza apunta solo a la fila de su marca. El mapeo no
contiene texto de piezas —solo rutas e identificadores—, así que no cruza la frontera
por sí mismo, pero **sí revela qué piezas existen en cada marca** y por eso sigue las
mismas reglas de aislamiento que el resto.

**Open source.** Las direcciones del workspace son del autor: van a configuración, no
al código. Cae bajo el mismo criterio de `public-release`.

**Lo que no resuelve.** Si una fila se borra en el destino, el mapeo queda apuntando a
la nada hasta la próxima sincronización. Por eso el mapeo declara su antigüedad en vez
de presentarse como verdad actual.
