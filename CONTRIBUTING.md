# Contribuir

Los cambios entran **por un change de OpenSpec**, no por un PR suelto.

No es burocracia: este repo existe porque varias decisiones de fondo se tomaron
mal una primera vez y costaron datos. Lo que un change obliga a escribir —qué
problema resuelve, qué pasa si la fuente falta, qué se descartó y por qué— es
exactamente lo que faltaba cuando se tomaron esas decisiones.

## El flujo

```bash
openspec list                      # qué hay abierto
openspec show <change>             # leer uno
openspec validate --all            # antes de commitear
```

1. **Proponer.** `openspec/changes/<slug>/proposal.md` con el `Why`, el `What
   Changes` y el `Impact`. Si no podés escribir el `Why` sin repetir el `What`,
   todavía no está claro qué problema resuelve.
2. **Especificar.** `specs/<capability>/spec.md`, un `SHALL` por requirement y
   escenarios en `WHEN`/`THEN`.
3. **Tareas.** Cada una nombra **el archivo que toca y el comando que la
   verifica**. Una tarea que no se puede verificar no es una tarea.
4. **Aplicar.** Uno por vez, nunca en paralelo.
5. **Cerrar.** Dejar escrito en `tasks.md` qué quedó hecho **y qué no**, con
   fecha. La segunda mitad es la que más sirve seis meses después.

## Las reglas que valen para todo change

Están en `openspec/config.yaml` y salieron de haberlas roto:

1. **Fallar ruidoso, nunca vacío.** Un artefacto que muestra cero cuando no
   encontró nada parece información.
2. **Sin señal explícita no se infiere.** Derivar un campo desde datos que no lo
   contienen usa el valor conservador y reporta cuántos cayeron ahí.
3. **Un dueño por campo.** Nunca escriben los dos lados lo mismo.
4. **Las marcas no se mezclan.** Es privacidad, y la separación es estructural
   —segmento de ruta, deploys distintos— nunca un filtro en el cliente.
5. **Números reales o nada.** La ausencia de un dato se representa como
   ausencia, jamás como cero.
6. **Nada corre solo.** Toda ejecución la dispara una persona, que ve el
   resultado en el momento.
7. **La operación creativa vive en el vault; la de growth, en la plataforma.**
   Acá no se escribe una pieza.

## Antes de abrir un PR

```bash
npx tsc --noEmit
npm run lint
npm test              # vitest + los tests de Python de scripts/
npm run build
npm run audit         # read-only: qué ve el parser en cada fuente
```

Y dos verificaciones que pesan más que las demás:

- **El aislamiento entre marcas.** `src/lib/account-isolation.test.ts`. Si tocás
  rutas, carga de datos o el registro de fuentes, corré el build recortado
  (`GROWTH_SOURCES=<una marca> npm run build`) y confirmá que no se emitió
  ninguna ruta de la otra.
- **Los identificadores públicos.** Un cambio que altere los slugs ya publicados
  no entra sin declararlo: son URLs vivas.

## Lo que NO hace falta discutir

- **`slugify` no se toca.** Hay archivos con acentos en la ruta cuyos slugs son
  feos a propósito; normalizarlos rompería URLs vivas.
- **Los `.md` del vault no se reescriben para normalizarlos.** El dashboard se
  adapta al vault, no al revés. El vault es de una persona, no de esta app.
