/**
 * ¿ESTÁ COMPILADA LA CONSOLA LOCAL?
 *
 * Una sola función, importada por `next.config.ts` —que decide si `page.local.tsx`
 * entra en `pageExtensions`— y por el layout, que decide si dibuja el acceso.
 *
 * Existe porque las dos copias se desincronizaron. `next.config.ts` prendía la
 * consola en desarrollo por defecto, y el layout la gateaba con
 * `GROWTH_CONSOLE === '1'` a secas. El resultado: en un `npm run dev` normal la
 * ruta `/configuracion` SE COMPILABA y funcionaba escribiéndola a mano, pero no
 * había un solo link hacia ella en ningún lado. Se veía exactamente igual que si
 * la pantalla no existiera, y esa conclusión se sacó más de una vez.
 *
 * LA REGLA. Prendida si `GROWTH_CONSOLE=1`, o si es desarrollo y no se la apagó
 * con `GROWTH_CONSOLE=0`. Lo que importa gatear es el build QUE SE PUBLICA, y ese
 * no corre en desarrollo: el workflow de CI no define la variable, así que sigue
 * sin compilarse. El `=0` existe para poder probar en local lo que ve un externo.
 */
export function consolaLocal(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.GROWTH_CONSOLE === '1' ||
    (env.NODE_ENV === 'development' && env.GROWTH_CONSOLE !== '0')
  );
}
