"use client";

import { ClerkProvider, useUser } from "@clerk/nextjs";
import SesionControles from "./SesionControles";

/**
 * El saludo de la raíz, con el nombre de quien entró.
 *
 * VIENE DEL CLIENTE Y NO DEL SERVIDOR. `currentUser()` en la página lo resolvería
 * en el render, pero volvería DINÁMICA la raíz —y por arrastre el resto— y eso
 * cuesta el prerender, que es lo que permite que el deploy no necesite los vaults.
 * El nombre de quien mira no vale ese precio: aparece un instante después.
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
    <ClerkProvider>
      {/* En fila: el avatar es de quien saluda, así que va al lado del nombre y
          no debajo, donde parecía un elemento suelto. */}
      <div className="flex items-center justify-center gap-3">
        <Nombre />
        <SesionControles />
      </div>
    </ClerkProvider>
  );
}
