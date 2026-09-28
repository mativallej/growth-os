import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { consolaLocal } from "./src/lib/consola";

// UNA INSTALACIÓN, UNA MARCA (D-17). La fuente se declara en config/sources.json;
// si su raíz falta, el build rompe (regla dura 1).
//
// `GROWTH_SOURCES` se fue el 2026-09-28: recortaba cuáles marcas entraban al
// build, y era la frontera de privacidad cuando un deploy servía a varias. Con
// un vault por marca no hay nada que recortar.
// LA CONSOLA NO EXISTE FUERA DEL ENTORNO LOCAL, y su ausencia es estructural.
//
// Esconder el botón no alcanza: un manejador que prepara operaciones y abre
// sesiones en la máquina, si queda accesible, es ejecución remota de código. Lo
// que se hace es no compilarlo. Los archivos de la consola se llaman
// `page.local.tsx` / `*.local.ts`, y esa extensión solo entra en `pageExtensions`
// cuando GROWTH_CONSOLE=1. Sin esa variable, Next ni siquiera los reconoce como
// rutas: no hay ruta, no hay manejador, y nada de lo que importan entra al bundle.
//
// EN DESARROLLO ESTÁ PRENDIDA POR DEFECTO, y la regla vive en `src/lib/consola.ts`
// porque estaba escrita DOS VECES y las dos copias se separaron: acá prendía la
// consola en dev, y el layout la gateaba con `GROWTH_CONSOLE === '1'` a secas.
// La ruta se compilaba y no había un link hacia ella en ningún lado.

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
  // EL ORDEN DE ESTA LISTA IMPORTA, y cuesta media hora descubrirlo. Verificado:
  // con `['tsx', 'ts', ..., 'local.tsx', 'local.ts']` —las genéricas primero— un
  // `next dev` con GROWTH_CONSOLE=1 devuelve 404 en `/`, mientras `/tegu`,
  // `/configuracion` y `/operar` andan. Poniendo las específicas primero, las
  // cuatro dan 307. Las extensiones compuestas van ANTES que las que son su
  // sufijo: `local.tsx` antes de `tsx`.
  pageExtensions: consolaLocal()
    ? ['local.tsx', 'local.ts', 'tsx', 'ts', 'jsx', 'js']
    : ['tsx', 'ts', 'jsx', 'js'],

  // Las rutas viejas no existen más: se borraron para que no hagan shadow de
  // `/[account]/...`. Estos redirects son para los links ya compartidos.
  // `permanent: false` (307) y no 308: la cuenta por defecto depende de cómo se
  // buildeó, y un 308 lo cachearía para siempre en el navegador de alguien.
  //
  async redirects() {
    const cuenta = cuentaPorDefecto();
    return [
      // `/piezas` era una lista y ahora es una VISTA del inventario, así que el
      // link viejo va ahí y no a una ruta que dejó de existir. El detalle de una
      // pieza (`/piezas/:slug`) sigue donde estaba.
      { source: '/piezas', destination: `/${cuenta}/inventario`, permanent: false },
      { source: '/piezas/:slug', destination: `/${cuenta}/piezas/:slug`, permanent: false },
      { source: '/inventario', destination: `/${cuenta}/inventario`, permanent: false },
      // Y el mismo caso CON marca: `/tegu/piezas` era una ruta real y quedaría en
      // 404. Va antes de nada que pueda hacerle shadow, y no toca
      // `/tegu/piezas/:slug`, que sigue siendo el detalle de la pieza.
      { source: '/:cuenta/piezas', destination: '/:cuenta/inventario', permanent: false },
    ];
  },
};

/**
 * La marca de esta instalación, para los redirects de links viejos.
 *
 * Con D-17 hay UNA: `growth-os` se instala una vez por marca. Antes esto
 * recortaba por `GROWTH_SOURCES` para elegir "la primera que entró al build";
 * ahora es la única que hay, y si la config declarara dos, la primera es tan
 * arbitraria como cualquiera — pero eso sería una config mal armada y el
 * workflow lo reporta.
 *
 * Lee `config/sources.json` con `fs` en vez de importarlo: next.config.ts se
 * evalúa antes del pipeline de TypeScript del proyecto y no puede usar
 * `@/lib/sources`, pero el JSON sí se puede leer.
 */
function cuentaPorDefecto(): string {
  const { brands } = JSON.parse(
    readFileSync(new URL('./config/sources.json', import.meta.url), 'utf8'),
  ) as { brands: { id: string }[] };
  return brands[0]?.id ?? '';
}

export default nextConfig;
