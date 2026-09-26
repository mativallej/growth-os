import type { NextConfig } from "next";

// El dashboard lee los .md de los vaults con fs en build/RSC. Sin API ni DB.
// Las fuentes se declaran en src/lib/sources.ts sobre config/sources.json; si
// una raíz falta, el build rompe (regla dura 1). GROWTH_SOURCES recorta cuáles
// entran.
// LA CONSOLA NO EXISTE FUERA DEL ENTORNO LOCAL, y su ausencia es estructural.
//
// Esconder el botón no alcanza: un manejador que prepara operaciones y abre
// sesiones en la máquina, si queda accesible, es ejecución remota de código. Lo
// que se hace es no compilarlo. Los archivos de la consola se llaman
// `page.local.tsx` / `*.local.ts`, y esa extensión solo entra en `pageExtensions`
// cuando GROWTH_CONSOLE=1. Sin esa variable, Next ni siquiera los reconoce como
// rutas: no hay ruta, no hay manejador, y nada de lo que importan entra al bundle.
const consolaLocal = process.env.GROWTH_CONSOLE === '1';

// La marca a la que van a parar las rutas viejas. Es la primera fuente que
// entró al build, con el mismo orden y la misma variable que usa
// src/lib/sources.ts — si el build se recorta a una marca, las rutas viejas
// apuntan a esa y no a una que no existe.
//
// Duplicado a propósito: next.config.ts se evalúa antes del pipeline de
// TypeScript del proyecto y no puede importar `@/lib/sources`. Lo que se repite
// es el ORDEN del registro, no las rutas.
const ORDEN_FUENTES = ['tegu', 'personal'];
const enBuild = (process.env.GROWTH_SOURCES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const cuentaPorDefecto =
  ORDEN_FUENTES.find((id) => enBuild.length === 0 || enBuild.includes(id)) ?? ORDEN_FUENTES[0];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: consolaLocal
    ? ['tsx', 'ts', 'jsx', 'js', 'local.tsx', 'local.ts']
    : ['tsx', 'ts', 'jsx', 'js'],

  // Las rutas viejas no existen más: se borraron para que no hagan shadow de
  // `/[account]/...`. Estos redirects son para los links ya compartidos.
  // `permanent: false` (307) y no 308: la cuenta por defecto depende de cómo se
  // buildeó, y un 308 lo cachearía para siempre en el navegador de alguien.
  async redirects() {
    return [
      { source: '/', destination: `/${cuentaPorDefecto}`, permanent: false },
      { source: '/piezas', destination: `/${cuentaPorDefecto}/piezas`, permanent: false },
      { source: '/piezas/:slug', destination: `/${cuentaPorDefecto}/piezas/:slug`, permanent: false },
      { source: '/inventario', destination: `/${cuentaPorDefecto}/inventario`, permanent: false },
    ];
  },
};

export default nextConfig;
