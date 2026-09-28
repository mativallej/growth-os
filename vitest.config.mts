import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` es un paquete que existe para REVENTAR si alguien lo
      // importa desde un bundle de cliente. En vitest no hay bundle de cliente y
      // no hay condición `react-server`, así que resuelve a la versión que tira
      // el error y ningún módulo de servidor se podría testear. Se apunta a un
      // archivo vacío: la protección sigue siendo real donde importa, que es el
      // build de Next.
      'server-only': fileURLToPath(new URL('./test/vacio.ts', import.meta.url)),
    },
  },
});
