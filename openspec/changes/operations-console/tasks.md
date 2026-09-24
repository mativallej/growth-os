# Tasks

> Requiere `account-scoped-routes` cerrado (la consola vive bajo la ruta de marca) y
> `unschedule-everything` (la marca de última corrida que la consola lee).

## 1. El catálogo

- [ ] 1.1 `src/lib/operations.ts`: tipo de operación (id, nombre, descripción, parámetros, precondiciones, forma de ejecución, período esperado) y la declaración de las que ya existen: ingesta de analytics, sync de contenido, sync de documentación, digest, exportaciones.
- [ ] 1.2 Tipar los parámetros comunes: rango de fechas, marca, **ads/orgánico/ambos**, canal, estado. Verifica: test de que un valor fuera de lo declarado se rechaza.
- [ ] 1.3 Evaluador de precondiciones. Verifica: test con un insumo ausente → la operación no se puede disparar y dice qué falta.

## 2. Las exportaciones

- [ ] 2.1 Manejador de exportación que aplica los filtros del catálogo y devuelve un archivo. Verifica: exportar con un rango de fechas y contar las filas contra el mismo filtro aplicado a mano.
- [ ] 2.2 Cabecera del archivo con los filtros usados y la fecha de generación.
- [ ] 2.3 Caso sin resultados: mensaje, no archivo vacío.
- [ ] 2.4 Verificar el aislamiento: una exportación pedida desde una marca no puede traer filas de la otra. **Test obligatorio.**

## 3. La entrega a sesión local

- [ ] 3.1 Resolver el mecanismo de apertura de sesión en la máquina, con directorio de trabajo y prompt inicial. Probar a mano antes de integrar y anotar acá qué funcionó.
- [ ] 3.2 Armar el contexto que recibe la sesión: operación, parámetros, script que la implementa, y qué revisar antes de aplicar.
- [ ] 3.3 Confirmar que la aplicación no aplica nada por su cuenta: disparar una operación de escritura y verificar que ni los vaults ni el destino cambiaron hasta que la sesión lo hizo.

## 4. El gating local

- [ ] 4.1 Excluir del build compartido las rutas y manejadores de operación. **Estructural, no un `display: none`.** Verifica: construir para compartir y confirmar que las rutas no existen en el resultado.
- [ ] 4.2 Confirmar que los efectos no viajan en peticiones de navegación. Verifica: recargar la consola varias veces y comprobar que no se ejecutó nada.
- [ ] 4.3 Revisar que ningún parámetro se interpola crudo en un comando.

## 5. La antigüedad

- [ ] 5.1 Leer `.state/last-run-<id>.json` y mostrar la antigüedad por operación, destacando las vencidas.
- [ ] 5.2 Caso "nunca ejecutada" distinguido de "hace mucho".

## 6. Cerrar

- [ ] 6.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 6.2 Build compartido y test de aislamiento otra vez: este change agrega superficie nueva.
- [ ] 6.3 Anotar acá qué operaciones quedaron en el catálogo y cuáles se dejaron afuera a propósito.
