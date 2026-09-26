import PageHeader from '@/components/PageHeader';
import { estadoDe } from '@/lib/config-env';
import { grupoGeneral, gruposPorMarca } from '@/lib/config-catalogo';
import Config from './Config.local';
import { brandsConfig, listSources } from '@/lib/sources';
import { loadPieces } from '@/lib/parse';
import { primaryReach } from '@/lib/metrics';
import { distribucionDe, umbralesActuales } from '@/lib/config-viralidad';
import type { FilaCanal } from './Viralidad.local';

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

  // Los canales salen del CORPUS, no de una lista fija: si mañana aparece una red
  // nueva en los footers, su fila aparece sola con su distribución. Y se listan
  // TODOS los canales, también los que no tienen ninguna pieza medida — ahí la
  // fila dice que no hay de dónde sacar un umbral, que es exactamente el dato.
  const umbrales = umbralesActuales();
  const porCanal = new Map<string, { total: number; alcances: number[] }>();
  for (const p of loadPieces(listSources())) {
    const e = porCanal.get(p.channel) ?? { total: 0, alcances: [] };
    e.total++;
    const r = primaryReach(p);
    if (r !== null) e.alcances.push(r);
    porCanal.set(p.channel, e);
  }
  const canales: FilaCanal[] = [...porCanal.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([canal, e]) => ({
      canal,
      viral: umbrales[canal]?.viral != null ? String(umbrales[canal].viral) : '',
      destacado: umbrales[canal]?.destacado != null ? String(umbrales[canal].destacado) : '',
      dist: distribucionDe(canal, e.alcances, e.total),
    }));

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
        canales={canales}
      />
    </div>
  );
}
