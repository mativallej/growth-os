import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * QUÉ ESTOY COMPARANDO.
 *
 * Es el único estado de cliente que cruza componentes que no son padre e hijo:
 * lo escriben las filas de la tabla, lo lee la barra de acciones para decir
 * cuántas hay, y lo vuelve a leer el drawer para dibujar las columnas. Pasarlo
 * por props obligaría a que `InventarioClient` sea dueño de un estado que
 * ninguno de sus hijos directos usa, y a enhebrarlo por tres niveles.
 *
 * LO QUE **NO** VIVE ACÁ, Y ES A PROPÓSITO: los filtros, el orden, la vista, la
 * agrupación y las filas desplegadas. Todo eso nace y muere adentro de una sola
 * vista; moverlo a un store global no lo hace más compartido, lo hace más lejos.
 * Un `useState` que un componente lee y escribe es más fácil de seguir que una
 * acción que podría despacharla cualquiera.
 *
 * Y NO ES UNA CAPA DE SEGURIDAD. Un store vive en la memoria del navegador, igual
 * de visible desde la consola que un `useState`. Lo que protege los datos es que
 * Supabase se hable desde el servidor y que la RLS decida — ver
 * `src/app/api/favoritos/route.ts`.
 */

/**
 * QUÉ CLASE DE COSA se está comparando.
 *
 * `piezas`, o el id de la dimensión que agrupa: `campana`, `formulaCode`,
 * `canal`, `persona`, `angulo`, `ronda`, `coverage`, `status`. Es un string y no
 * una unión cerrada porque las dimensiones del tablero salen de `AGRUPACIONES`,
 * y agregar una tiene que seguir siendo agregar un objeto a esa lista.
 *
 * Empezó siendo `'piezas' | 'campanas'` y se generalizó cuando hubo que poder
 * comparar fórmulas: una fórmula, una red y una campaña son todas lo mismo para
 * esto —un conjunto de piezas— y tener un caso por dimensión habría sido el
 * mismo código seis veces.
 */
export type Ambito = string;

export const PIEZAS = 'piezas';

export type EstadoSeleccion = {
  /**
   * Las llaves elegidas. Un array y no un `Set` porque el estado de Redux tiene
   * que ser serializable: un `Set` rompe el devtool, la persistencia y el chequeo
   * que el propio toolkit trae en desarrollo.
   *
   * También conserva el ORDEN en que se eligieron, que es el orden en que se
   * dibujan las columnas del comparador. Con un `Set` sería orden de inserción
   * por accidente; acá es una decisión.
   */
  llaves: string[];
  /**
   * Qué se está comparando. Cambiarlo VACÍA la selección: una lista con dos
   * piezas y una fórmula adentro no se puede dibujar en columnas comparables, y
   * mezclarlas en silencio daría una tabla donde la mitad de las filas son
   * huecos.
   */
  ambito: Ambito;
  abierto: boolean;
};

/** Con una sola no hay comparación; con más de cuatro no entran las columnas. */
export const MAXIMO = 4;

const inicial: EstadoSeleccion = { llaves: [], ambito: PIEZAS, abierto: false };

export const seleccionSlice = createSlice({
  name: 'seleccion',
  initialState: inicial,
  reducers: {
    alternar(state, { payload }: PayloadAction<string>) {
      const i = state.llaves.indexOf(payload);
      if (i >= 0) {
        state.llaves.splice(i, 1);
        // Al quedarse sin nada que comparar, el drawer se cierra solo. Dejarlo
        // abierto y vacío es una pantalla que no dice nada.
        if (state.llaves.length === 0) state.abierto = false;
      } else if (state.llaves.length < MAXIMO) {
        state.llaves.push(payload);
      }
      // Pasado el máximo NO se descarta la más vieja para hacer lugar: el click
      // simplemente no hace nada y el checkbox queda deshabilitado. Sacar una
      // que la persona eligió, sin avisar, es peor que no agregar la nueva.
    },
    cambiarAmbito(state, { payload }: PayloadAction<Ambito>) {
      if (state.ambito === payload) return;
      state.ambito = payload;
      state.llaves = [];
      state.abierto = false;
    },
    limpiar(state) {
      state.llaves = [];
      state.abierto = false;
    },
    abrir(state, { payload }: PayloadAction<boolean>) {
      state.abierto = payload && state.llaves.length > 0;
    },
  },
});

export const { alternar, cambiarAmbito, limpiar, abrir } = seleccionSlice.actions;
export default seleccionSlice.reducer;
