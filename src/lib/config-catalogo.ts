import type { GrupoConfig } from './config-env';
import { listSources } from './sources';

// QUÉ SE PUEDE CONFIGURAR, derivado de las marcas declaradas.
//
// Los grupos por marca NO están hardcodeados: salen de `config/sources.json`, así
// que agregar una marca agrega su pestaña con sus claves. Es la misma regla que
// el resto del proyecto — n marcas × n redes × n cuentas, y ahora también n
// proyectos de Supabase (D-16).

const MAYUS = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '_');

/** Un grupo por marca: su índice derivado y su webhook de avisos. */
export function gruposPorMarca(): GrupoConfig[] {
  return listSources().map((s) => {
    const P = MAYUS(s.brand);
    return {
      id: s.id,
      titulo: s.label,
      detalle: `Raíz de contenido: ${s.roots.map((r) => r.replace(s.vault + '/', '')).join(', ')}`,
      claves: [
        {
          // El vault se declara en config/sources.json (que está en git) y esta
          // variable lo REAPUNTA sin tocar el repo. Es la salida para cuando el
          // vault se muda: el 2026-09-23 se renombró de `Brain` a
          // `brain-mativallej` y toda ruta hardcodeada se rompió en silencio.
          nombre: s.envVar,
          descripcion: `Reapunta el vault de esta marca. Vacío = lo que declara config/sources.json (${s.vault})`,
          tipo: 'dato',
          donde: 'Ruta absoluta o ~/… — siempre por ~/vaults/, nunca la ruta real',
        },
        {
          nombre: `SUPABASE_${P}_URL`,
          descripcion: 'URL del proyecto de Supabase de esta marca',
          tipo: 'dato',
          donde: 'Supabase → el proyecto → Settings → API',
        },
        {
          nombre: `SUPABASE_${P}_ANON_KEY`,
          descripcion: 'Clave pública. Respeta RLS',
          tipo: 'secreto',
          donde: 'Supabase → Settings → API Keys → anon',
        },
        {
          nombre: `SUPABASE_${P}_SERVICE_ROLE_KEY`,
          descripcion: 'SALTEA RLS POR COMPLETO. Solo servidor y scripts, nunca en cliente',
          tipo: 'secreto',
          donde: 'Supabase → Settings → API Keys → service_role',
        },
        {
          nombre: `DISCORD_WEBHOOK_${P}`,
          descripcion: 'Avisos de esta marca',
          tipo: 'secreto',
          donde: 'Discord → canal → Integraciones → Webhooks',
        },
      ],
    };
  });
}

/** Lo que no cuelga de una marca: las conexiones del proyecto. */
export function grupoGeneral(): GrupoConfig {
  return {
    id: 'general',
    titulo: 'Conexiones',
    detalle: 'Lo que vale para todo Growth Loop, sin importar la marca.',
    claves: [
      {
        nombre: 'NOTION_TOKEN',
        descripcion: 'Integración interna. Solo ve las páginas que le compartís',
        tipo: 'secreto',
        donde: 'Notion → Developer tools → Connections → API token. Después: la página Growth → ⋯ → Connections → conectarla',
      },
      {
        nombre: 'SUPABASE_ACCESS_TOKEN',
        descripcion: 'Token de cuenta, para que el CLI pueda correr migraciones',
        tipo: 'secreto',
        donde: 'supabase.com/dashboard/account/tokens',
      },
      {
        nombre: 'DISCORD_WEBHOOK_IDEAS',
        descripcion: 'Dónde caen las ideas captadas',
        tipo: 'secreto',
        donde: 'Discord → canal → Integraciones → Webhooks',
      },
      {
        nombre: 'CATALOG_DIR',
        descripcion: 'Catálogo de fórmulas. Si falta, se usan los códigos de reserva',
        tipo: 'dato',
        donde: 'Una carpeta del vault personal — Brand Identity/Catalog',
      },
    ],
  };
}
