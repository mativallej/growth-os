// `next lint` se removió en Next 16 — el linter es el CLI de ESLint con flat
// config. Ver node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
