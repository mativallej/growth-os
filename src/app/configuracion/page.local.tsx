import PageHeader from '@/components/PageHeader';
import { estadoDe } from '@/lib/config-env';
import { grupoGeneral, gruposPorMarca } from '@/lib/config-catalogo';
import Config from './Config.local';
import { brandsConfig } from '@/lib/sources';

// Configuración.
//
// Esta ruta SOLO existe con GROWTH_CONSOLE=1 (ver next.config.ts): el archivo se
// llama `page.local.tsx` y esa extensión no entra en `pageExtensions` fuera del
// entorno local. No es un `display:none` — sin la variable no hay ruta.
//
// Y acá el gating pesa más que en la consola: esta pantalla lista credenciales.
// Un `service_role` de Supabase en un build compartido es acceso total a la base.
// Aun acá los valores viajan ENMASCARADOS; el completo no sale del servidor.

export const dynamic = 'force-dynamic';

export default function ConfiguracionPage() {
  const marcas = estadoDe(gruposPorMarca());
  const [general] = estadoDe([grupoGeneral()]);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-9 md:px-10">
      <PageHeader
        title="Configuración"
        subtitle="Una pestaña por marca, más las conexiones del proyecto. Solo entorno local."
      />
      <Config
        marcas={marcas}
        general={general}
        listado={brandsConfig().map((b) => ({
          id: b.id,
          label: b.label,
          vault: b.vault,
          content: Array.isArray(b.content) ? b.content.join(' · ') : b.content,
        }))}
      />
    </div>
  );
}
