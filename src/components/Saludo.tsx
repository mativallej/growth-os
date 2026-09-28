"use client";

import { useUser } from "@clerk/nextjs";
import SesionControles from "./SesionControles";

/**
 * El saludo de la raíz, con el nombre de quien entró.
 *
 * VIENE DEL CLIENTE Y NO DEL SERVIDOR. `currentUser()` en la página lo resolvería
 * en el render, y ahora que todo es dinámico eso ya no cuesta el prerender. Sigue
 * siendo del cliente por otra razón: el saludo es lo primero que se pinta, y
 * hacerlo esperar a un ida y vuelta con Clerk retrasa TODA la página por un
 * nombre. Del cliente, la página llega enseguida y el nombre un instante después.
 *
 * MIENTRAS CARGA NO DICE "Hola undefined" ni parpadea un nombre falso: dice
 * "Hola" solo. Y si la cuenta no tiene nombre cargado —se puede entrar con un
 * mail y nada más— tampoco inventa uno del mail: el mail no es el nombre de
 * nadie, y "Hola matiasvallejosdev" se lee peor que "Hola".
 */
function Nombre() {
  const { user, isLoaded } = useUser();
  const nombre = isLoaded ? user?.firstName?.trim() : undefined;
  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      Hola{nombre ? `, ${nombre}` : ""}
    </h1>
  );
}

export default function Saludo() {
  return (
    // En fila: el avatar es de quien saluda, así que va al lado del nombre y no
    // debajo, donde parecía un elemento suelto.
    <div className="flex items-center justify-center gap-3">
      <Nombre />
      <SesionControles />
    </div>
  );
}
