# Tasks

> Change chico. La parte 1 no depende de nada; la parte 2 necesita que la
> sincronización haya corrido al menos una vez con `--apply`.

## 1. Los destinos del workspace

- [ ] 1.1 Llevar las direcciones de los destinos a configuración, junto con los identificadores que `public-release` tarea 1.1 saca del código. **Un solo lugar para los dos.**
- [ ] 1.2 Accesos en la interfaz, omitiendo los no configurados. Verifica: borrar un destino de la config y confirmar que su acceso desaparece, sin enlace muerto.

## 2. La correspondencia

- [ ] 2.1 `scripts/sync-notion.py` guarda ruta → identificador de registro en `.state/`, tanto al crear como al reconocer uno existente. Verifica: correr con `--apply` y confirmar que el archivo se escribe.
- [ ] 2.2 Confirmar que un dry-run **no** modifica la correspondencia guardada.
- [ ] 2.3 Verificar que ningún `.md` quedó tocado por esto: `git -C <vault> status --short` sin cambios.
- [ ] 2.4 Guardar cuándo se actualizó, para poder mostrar la antigüedad.

## 3. Los enlaces por pieza

- [ ] 3.1 `src/lib/notion-links.ts`: leer la correspondencia y resolver el enlace de una pieza. Función pura sobre el estado leído.
- [ ] 3.2 Enlace en la vista de pieza cuando hay correspondencia; aviso de "sin sincronizar" cuando no. Verifica: test de las dos ramas.
- [ ] 3.3 Mostrar la antigüedad de la correspondencia donde se usan los enlaces.
- [ ] 3.4 Test de que un enlace nunca apunta al registro de otra marca.

## 4. Cerrar

- [ ] 4.1 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 4.2 Borrar `.state/` y confirmar que la app sigue funcionando sin enlaces, sin errores.
