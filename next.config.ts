import { readFileSync } from "node:fs";
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

// POR QUÉ ESTE REPO NO SE PUBLICA COMO EXPORT ESTÁTICO.
//
// Estuvo a un paso: todas las rutas prerenderizan, no hay Server Actions fuera de
// la consola, ni cookies, ni route handlers. Pero `output: 'export'` NO SOPORTA
// Proxy, y el gate de autenticación vive en `src/proxy.ts` — sin Proxy no hay
// dónde ponerlo.
//
// Y el gate no puede ser del lado del cliente: como las páginas prerenderizan, el
// contenido de los .md ya está dentro del HTML. Esconder la UI serviría los bytes
// igual. Un export estático de este repo es el vault publicado.
//
// Lo que sí se conserva del intento: `/` es una página de verdad y no un redirect
// de next.config (ver src/app/page.tsx).

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: consolaLocal
    ? ['tsx', 'ts', 'jsx', 'js', 'local.tsx', 'local.ts']
    : ['tsx', 'ts', 'jsx', 'js'],

  // Las rutas viejas no existen más: se borraron para que no hagan shadow de
  // `/[account]/...`. Estos redirects son para los links ya compartidos.
  // `permanent: false` (307) y no 308: la cuenta por defecto depende de cómo se
  // buildeó, y un 308 lo cachearía para siempre en el navegador de alguien.
  //
  async redirects() {
    const cuenta = cuentaPorDefecto();
    return [
      { source: '/piezas', destination: `/${cuenta}/piezas`, permanent: false },
      { source: '/piezas/:slug', destination: `/${cuenta}/piezas/:slug`, permanent: false },
      { source: '/inventario', destination: `/${cuenta}/inventario`, permanent: false },
    ];
  },
};

/**
 * La marca a la que van a parar las rutas viejas: la primera del registro que
 * haya entrado al build, con el mismo orden que usa src/lib/sources.ts.
 *
 * Lee config/sources.json con `fs` en vez de importarlo: next.config.ts se evalúa
 * antes del pipeline de TypeScript del proyecto y no puede usar `@/lib/sources`,
 * pero el JSON sí se puede leer. Antes acá había una lista de ids repetida a mano
 * —`['tegu', 'personal']`— que ya estaba desactualizada: decía `personal` cuando
 * el id de la marca pasó a ser `mativallej`.
 */
function cuentaPorDefecto(): string {
  const { brands } = JSON.parse(
    readFileSync(new URL('./config/sources.json', import.meta.url), 'utf8'),
  ) as { brands: { id: string }[] };
  const orden = brands.map((b) => b.id);
  const enBuild = (process.env.GROWTH_SOURCES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return orden.find((id) => enBuild.length === 0 || enBuild.includes(id)) ?? orden[0];
}

export default nextConfig;
