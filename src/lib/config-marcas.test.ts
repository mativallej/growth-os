import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { validarMarca } from './config-marcas';
import { brandsConfig } from './sources';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function vaultConContenido(sub = 'Content/Create'): string {
  const d = mkdtempSync(join(tmpdir(), 'growth-loop-marca-'));
  temps.push(d);
  mkdirSync(join(d, sub), { recursive: true });
  return d;
}

const base = (over = {}) => ({
  id: 'marca-nueva', label: 'Marca Nueva', vault: '', content: 'Content/Create', ...over,
});

describe('validar una marca antes de escribirla', () => {
  it('acepta una marca bien formada', () => {
    const v = vaultConContenido();
    expect(validarMarca(base({ vault: v }), [])).toBeNull();
  });

  it('rechaza un id que no sirve como segmento de URL', () => {
    const v = vaultConContenido();
    // Va en la URL: espacios, guiones bajos, acentos y arrancar con número la
    // rompen o la ensucian.
    for (const id of ['Marca Nueva', 'marca_nueva', '1marca', 'á', 'a']) {
      expect(validarMarca(base({ id, vault: v }), []), id).toMatch(/minúsculas/i);
    }
  });

  it('las mayúsculas se NORMALIZAN, no se rechazan', () => {
    // Escribir "Tegu" y que te diga que está mal sería pedantería: lo que va a
    // la URL es `tegu`, y eso se puede resolver sin molestar a nadie.
    const v = vaultConContenido();
    expect(validarMarca(base({ id: 'MarcaNueva', vault: v }), [])).toBeNull();
  });

  it('rechaza un id repetido', () => {
    const v = vaultConContenido();
    const err = validarMarca(base({ vault: v }), [{ id: 'marca-nueva' } as never]);
    expect(err).toMatch(/Ya existe/);
  });

  it('rechaza una ruta relativa: depende de desde dónde se corra el build', () => {
    expect(validarMarca(base({ vault: '../algo' }), [])).toMatch(/absoluta/);
  });

  it('rechaza un vault que no existe, nombrándolo', () => {
    const err = validarMarca(base({ vault: '/no/existe/nada' }), []);
    expect(err).toMatch(/No existe \/no\/existe\/nada/);
  });

  it('rechaza una subcarpeta de contenido que no existe DENTRO del vault', () => {
    // Es el error más fácil de cometer: la ruta del vault está bien y la
    // subcarpeta está mal escrita. Sin esto, la marca se agrega y el build se
    // cae después, con un error que no dice que alguien apretó un botón.
    const v = vaultConContenido();
    expect(validarMarca(base({ vault: v, content: 'Carpeta/Inventada' }), [])).toMatch(/No existe/);
  });

  it('pide el nombre visible', () => {
    const v = vaultConContenido();
    expect(validarMarca(base({ vault: v, label: '  ' }), [])).toMatch(/nombre visible/);
  });
});

describe('las marcas reales pasan su propia validación', () => {
  it('cada marca declarada sería aceptable hoy', () => {
    // Si una marca que ya está en la config no pasara el validador, el
    // validador estaría pidiendo algo que el proyecto no cumple.
    const marcas = brandsConfig();
    for (const b of marcas) {
      const content = Array.isArray(b.content) ? b.content[0] : b.content;
      const otras = marcas.filter((x) => x.id !== b.id);
      expect(
        validarMarca({ id: b.id, label: b.label, vault: b.vault, content }, otras),
        b.id,
      ).toBeNull();
    }
  });
});
