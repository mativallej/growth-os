'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { crearStore, type Store } from '@/store';

/**
 * El `<Provider>` de Redux, como isla de cliente.
 *
 * Envuelve toda la app pero NO la vuelve cliente: un componente de servidor
 * pasado como `children` se sigue renderizando en el servidor. Solo los que
 * llaman a `useSelector` tienen que ser de cliente, y ya lo eran.
 *
 * El store se crea con el INICIALIZADOR PEREZOSO de `useState` y no en el cuerpo
 * del componente: en el cuerpo se crearía uno nuevo en cada render, y cada uno
 * empezaría con el estado inicial — la selección se borraría sola al primer
 * re-render del padre.
 *
 * Tampoco con un `useRef` que se completa durante el render, que es el patrón que
 * circula para esto: el React Compiler lo rechaza —"Cannot access refs during
 * render"— y tiene razón, porque un render puede descartarse y volver a correr.
 * El inicializador de `useState` está pensado justo para esto y corre una vez.
 */
export default function Store({ children }: { children: ReactNode }) {
  const [store] = useState<Store>(crearStore);
  return <Provider store={store}>{children}</Provider>;
}
