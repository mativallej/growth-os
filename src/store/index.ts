import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import seleccion from './seleccion';

/**
 * EL STORE, Y SE CREA POR REQUEST.
 *
 * `configureStore()` una sola vez a nivel de módulo es el error clásico de Redux
 * en el App Router: en el servidor ese módulo es un singleton del PROCESO, así
 * que dos personas pidiendo la página al mismo tiempo comparten store, y lo que
 * una seleccionó puede aparecer en el render de la otra. Se crea uno nuevo por
 * request —`Store.tsx` lo hace— y en el navegador queda uno solo porque el
 * componente se monta una vez.
 *
 * Un slice. Es deliberado: el store guarda lo que cruza componentes que no son
 * padre e hijo, y hoy eso es la selección para comparar. Los filtros, el orden y
 * la vista siguen en `useState` de su vista.
 */
export function crearStore() {
  return configureStore({ reducer: { seleccion } });
}

export type Store = ReturnType<typeof crearStore>;
export type Estado = ReturnType<Store['getState']>;
export type Dispatch = Store['dispatch'];

// Los hooks tipados. Sin esto cada `useSelector` tendría que anotar el estado a
// mano, y el que se olvide recibe `any` sin que nada se queje.
export const useAppDispatch = useDispatch.withTypes<Dispatch>();
export const useAppSelector = useSelector.withTypes<Estado>();
