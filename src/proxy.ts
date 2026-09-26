import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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

const esPublica = createRouteMatcher([
  // El handshake de Clerk. Si esto pidiera sesión, no habría forma de obtenerla.
  '/__clerk(.*)',
  // Las pantallas de sign-in/sign-up las hospeda Clerk (Account Portal), así que
  // no hay rutas locales que abrir. Quedan declaradas para el día que se
  // agreguen: sin esto, agregarlas las dejaría exigiendo la sesión que sirven
  // para conseguir, que es un lazo cerrado difícil de diagnosticar.
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!esPublica(req)) await auth.protect();
});

export const config = {
  // El matcher que recomienda Clerk: excluye los estáticos por EXTENSIÓN
  // CONOCIDA, no "todo lo que tenga un punto". Esa versión más corta que circula
  // deja pasar sin autenticar los payloads RSC de las páginas prerenderizadas,
  // que son el contenido entero en otro formato.
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
