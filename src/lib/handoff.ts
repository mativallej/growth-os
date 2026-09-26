import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Operation } from './operations';
import { evaluar, validarParams } from './operations';
import { repoRoot, stateDir } from './repo';

// La entrega a sesión local.
//
// Sería más simple que el botón corriera el script. Se descarta por dos razones y
// cada una alcanzaría sola.
//
// La de seguridad: un manejador que lanza procesos con parámetros de la interfaz
// es ejecución remota de código en cuanto el build se comparta o el puerto quede
// expuesto. Se puede mitigar con validación, pero la mitigación tiene que ser
// perfecta todas las veces; delegar la ejecución elimina la clase entera.
//
// La de criterio, que importa más: las operaciones que escriben necesitan que
// alguien mire antes de aplicar. Los scripts ya previsualizan por defecto, pero una
// previsualización necesita un lector. Un botón que aplica directo convierte una
// revisión en un clic — que es exactamente cómo se cargaron 51 piezas con el estado
// equivocado el 2026-09-23.
//
// Entonces: LA APP PREPARA, LA SESIÓN EJECUTA, LA PERSONA APRUEBA.

export type Entrega = {
  id: string;
  /** El .md con todo el contexto. Es lo único que la app escribe. */
  archivoContexto: string;
  contexto: string;
  /** El comando que la sesión va a correr, ya listo para copiar. */
  comandoSugerido: string;
  /** Con qué se abre la sesión. argv, nunca una string de shell. */
  lanzador: { comando: string; args: string[] } | null;
};

/**
 * Todo lo que la app genera para el sistema de archivos pasa por acá. Un id que no
 * sea exactamente esto no llega a formar parte de ninguna ruta ni de ningún
 * comando.
 */
const ID_SEGURO = /^[a-z0-9-]+$/;

function citar(v: string): string {
  return `'${v.replace(/'/g, `'\\''`)}'`;
}

function argvDe(op: Operation, valores: Record<string, string>): string[] {
  if (!op.implementacion) return [];
  return [...op.implementacion.args, ...(op.implementacion.argsDe?.(valores) ?? [])];
}

function contextoDe(op: Operation, valores: Record<string, string>, comando: string): string {
  const params = op.params
    .map((p) => {
      const v = valores[p.id];
      const puesto = v === undefined ? '(sin valor)' : v;
      const porDefecto = p.porDefecto !== undefined && v === p.porDefecto ? '  ← el default declarado' : '';
      return `- **${p.label}** (\`${p.id}\`): ${puesto}${porDefecto}`;
    })
    .join('\n');

  return `# Operación preparada: ${op.nombre}

${op.descripcion}

**La app no aplicó nada.** Preparó esta operación y te la pasó. Ejecutar, revisar la
previsualización y decidir si aplicar es tuyo.

## Qué se pidió

- Operación: \`${op.id}\`
- Forma de ejecución: ${op.forma}
- Preparada: ${new Date().toISOString()}

## Con qué parámetros

${params || '- (ninguno)'}

## Qué la implementa

\`\`\`bash
${comando}
\`\`\`

Los scripts previsualizan por defecto: hay que agregar \`--apply\` a propósito.

## Qué revisar antes de aplicar

${(op.queRevisar ?? ['(nada declarado — vale la pena declararlo en el catálogo)']).map((q) => `- ${q}`).join('\n')}
`;
}

/**
 * Prepara la entrega. Valida contra el catálogo, evalúa precondiciones, y escribe
 * el contexto. NO ejecuta nada y NO toca nada fuera de `.state/`.
 */
export function prepararEntrega(
  op: Operation,
  entrada: Record<string, unknown>,
  dir = stateDir(),
  ahora = new Date(),
): Entrega {
  if (!ID_SEGURO.test(op.id)) throw new Error(`Id de operación no apto para una ruta: "${op.id}".`);

  const v = validarParams(op, entrada);
  if (!v.ok) {
    throw new Error(
      `Parámetros inválidos para "${op.id}":\n` +
        v.errores.map((e) => `  ${e.param}: ${e.motivo}`).join('\n'),
    );
  }
  const disp = evaluar(op);
  if (!disp.disparable) {
    throw new Error(
      `"${op.nombre}" no se puede disparar.\n` +
        (disp.bloqueo ? `  ${disp.bloqueo}\n` : '') +
        disp.faltantes.map((f) => `  ${f.falta} → ${f.comoObtenerlo}`).join('\n'),
    );
  }

  const argv = argvDe(op, v.valores);
  // Los valores se citan solo para que la persona pueda copiar el comando. Esta
  // string NUNCA se ejecuta desde acá: lo que se lanza abajo es argv.
  const comandoSugerido = op.implementacion
    ? [op.implementacion.comando, ...argv.map((a) => (/^[\w.\-/=]+$/.test(a) ? a : citar(a)))].join(' ')
    : '(la operación no declara ejecutable)';

  const sello = ahora.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const nombre = `handoff-${op.id}-${sello}.md`;
  if (!/^[\w.-]+$/.test(nombre)) throw new Error(`Nombre de archivo no apto: ${nombre}`);

  const archivoContexto = join(dir, nombre);
  const contexto = contextoDe(op, v.valores, comandoSugerido);
  mkdirSync(dir, { recursive: true });
  writeFileSync(archivoContexto, contexto, 'utf8');

  return {
    id: `${op.id}-${sello}`,
    archivoContexto,
    contexto,
    comandoSugerido,
    lanzador: lanzadorDe(archivoContexto),
  };
}

/**
 * Cómo se abre la sesión. Es un detalle de implementación —lo que el spec fija es
 * que la app no aplica y que entrega con contexto suficiente— así que se aísla acá.
 *
 * Nada de lo que viene de la interfaz entra en esta string: el único valor
 * interpolado es la ruta del contexto, que la generó la app y que se valida.
 */
export function lanzadorDe(archivoContexto: string): Entrega['lanzador'] {
  if (process.platform !== 'darwin') return null;
  // La ruta la generó la app, no la interfaz. El recaudo es contra lo único que
  // podría romper las comillas de abajo — no una lista blanca de caracteres, que
  // fallaría con un tmpdir cualquiera.
  if (/['\n\r]/.test(archivoContexto)) {
    throw new Error(`Ruta de contexto no apta para el lanzador: ${archivoContexto}`);
  }
  const prompt = `Leé ${archivoContexto} y ejecutá la operación que describe. No apliques nada sin mostrarme antes la previsualización.`;
  const guion = `cd ${citar(repoRoot())} && claude ${citar(prompt)}`;
  return {
    comando: 'osascript',
    args: ['-e', `tell application "Terminal" to do script ${JSON.stringify(guion)}`],
  };
}

/** Abre la sesión. Separado de `prepararEntrega` para que preparar sea testeable. */
export function abrirSesion(entrega: Entrega): boolean {
  if (!entrega.lanzador) return false;
  const { comando, args } = entrega.lanzador;
  // argv, sin shell. Un parámetro no puede convertirse en otro comando.
  const hijo = spawn(comando, args, { stdio: 'ignore', detached: true });
  hijo.unref();
  return true;
}
