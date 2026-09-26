// Los tipos viven aparte porque un módulo `'use server'` solo puede exportar
// funciones async.
export type ResultadoAccion = {
  ok: boolean;
  mensaje: string;
  /** El contexto que se le entregó a la sesión, o el detalle del rechazo. */
  detalle?: string;
  archivo?: string;
  comando?: string;
  sesionAbierta?: boolean;
};

export const SIN_RESULTADO: ResultadoAccion = { ok: true, mensaje: '' };
