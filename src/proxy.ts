import { clerkMiddleware } from '@clerk/nextjs/server';

// LA CAPA DE AUTENTICACIÓN, Y ES DENY POR DEFECTO.
//
// No hay lista de rutas protegidas: hay una lista de rutas públicas, y todo lo
// que no está en ella exige sesión. La diferencia importa — con una lista de
// protegidas, una vista nueva nace abierta, y nadie se entera hasta que alguien
// la encuentra. Con esta forma, una vista nueva nace cerrada.
//
// Va en `proxy.ts` y no en `middleware.ts`: en Next 16 el convenio `middleware`
// está deprecado y renombrado a `proxy`, y el export se llama `proxy`.
//
// POR QUÉ ESTO Y NO UN GATE EN EL CLIENTE: las páginas de esta app están
// prerenderizadas, así que el contenido de los .md ya está dentro del HTML y del
// payload RSC. Un `<Show when="signed-in">` esconde la UI y sirve los bytes
// igual. El chequeo tiene que pasar ANTES de que la respuesta salga, y ese es el
// único lugar donde puede pasar.
//
// Es también la razón por la que este repo no se publica como export estático:
// `output: 'export'` no soporta Proxy, y sin Proxy no hay dónde poner el gate.
//
// SOBRE LA ADVERTENCIA DE CLERK. Clerk deprecó `createRouteMatcher` y recomienda
// mover los chequeos a cada página, porque el path matching puede divergir de
// cómo Next rutea. El argumento es correcto y por eso el matcher de abajo no
// excluye "todo lo que tenga un punto". Pero acá NO se sigue la recomendación:
// un `await auth()` dentro de cada página la vuelve dinámica, y eso cuesta las
// diez rutas prerenderizadas —medido— que son lo que permite que el deploy no
// necesite los vaults y que `dynamicParams = false` siga siendo la garantía de
// que una marca ausente del build no se sirva bajo demanda. Se cambia una
// propiedad estructural por una defensa contra un riesgo que acá está acotado:
// la lista de públicas tiene tres entradas y ninguna sirve contenido.
//
// Lo que sí se hace es no usar la función deprecada.

/**
 * Las rutas que NO piden sesión, y por qué cada una.
 *
 * Se comparan a mano en vez de con `createRouteMatcher`, que está deprecado. Son
 * tres prefijos: escribir la comparación es más corto que la dependencia.
 */
function esPublica(pathname: string): boolean {
  return (
    // El handshake de Clerk. Si pidiera sesión, no habría forma de obtenerla.
    pathname.startsWith('/__clerk') ||
    // Las pantallas de entrar y registrarse. Son catch-all —Clerk usa subrutas
    // para verificación por mail, factor doble y SSO— así que el prefijo tiene
    // que cubrir todo lo que cuelgue debajo.
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/') ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-up/')
  );
}

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!esPublica(req.nextUrl.pathname)) await auth.protect();
});

export const config = {
  // El matcher que recomienda Clerk: excluye los estáticos por EXTENSIÓN
  // CONOCIDA, no "todo lo que tenga un punto". Esa versión más corta que circula
  // deja pasar sin autenticar los payloads RSC de las páginas prerenderizadas,
  // que son el contenido entero en otro formato. Verificado: `/tegu/piezas.rsc`
  // da 307 con este matcher.
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
