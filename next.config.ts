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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: consolaLocal
    ? ['tsx', 'ts', 'jsx', 'js', 'local.tsx', 'local.ts']
    : ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
