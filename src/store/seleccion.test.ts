import { describe, expect, it } from 'vitest';
import reducer, { abrir, alternar, cambiarModo, limpiar, MAXIMO } from './seleccion';

const inicial = reducer(undefined, { type: '@@init' });
/** Aplica una lista de acciones en orden, desde el estado inicial. */
const correr = (...acciones: Parameters<typeof reducer>[1][]) =>
  acciones.reduce((e, a) => reducer(e, a), inicial);

describe('la selección para comparar', () => {
  it('conserva el orden en que se eligieron', () => {
    // Es el orden de las columnas del comparador. Con un Set sería orden de
    // inserción por accidente; acá es una decisión.
    expect(correr(alternar('c'), alternar('a'), alternar('b')).llaves).toEqual(['c', 'a', 'b']);
  });

  it('alternar la misma llave la saca', () => {
    expect(correr(alternar('a'), alternar('b'), alternar('a')).llaves).toEqual(['b']);
  });

  it('al llegar al máximo NO descarta la más vieja', () => {
    // Sacar en silencio algo que la persona eligió es peor que no agregar lo
    // nuevo: el checkbox queda deshabilitado y dice por qué.
    const llenas = Array.from({ length: MAXIMO }, (_, i) => alternar(`p${i}`));
    const e = correr(...llenas, alternar('una-mas'));
    expect(e.llaves).toHaveLength(MAXIMO);
    expect(e.llaves).not.toContain('una-mas');
    expect(e.llaves[0]).toBe('p0');
  });

  it('cambiar de modo vacía lo elegido', () => {
    // Dos piezas y una campaña no se dibujan en columnas comparables, y
    // mezclarlas daría una tabla donde la mitad de las filas son huecos.
    const e = correr(alternar('a'), alternar('b'), abrir(true), cambiarModo('campanas'));
    expect(e.llaves).toEqual([]);
    expect(e.abierto).toBe(false);
    expect(e.modo).toBe('campanas');
  });

  it('cambiar al modo que ya estaba no borra nada', () => {
    expect(correr(alternar('a'), cambiarModo('piezas')).llaves).toEqual(['a']);
  });

  it('el drawer se cierra al quedarse sin nada', () => {
    // Abierto y vacío es una pantalla que no dice nada.
    expect(correr(alternar('a'), abrir(true), alternar('a')).abierto).toBe(false);
  });

  it('no se puede abrir sin nada elegido', () => {
    expect(correr(abrir(true)).abierto).toBe(false);
  });

  it('limpiar deja todo como al principio', () => {
    expect(correr(alternar('a'), abrir(true), limpiar())).toEqual(inicial);
  });
});
