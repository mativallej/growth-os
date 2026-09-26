export default function PageHeader({
  title,
  subtitle,
  /** Controles alineados a la derecha del título: filtros, acciones. */
  acciones,
}: {
  title: string;
  subtitle?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {/* `break-words`: los títulos salen de nombres de archivo, y uno largo
            sin espacios —un slug pegado— desborda la pantalla en un teléfono. */}
        <h1 className="break-words text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {/* Sin `shrink-0`: con filtros anchos adentro, impedir que se encoja
          empujaba el bloque fuera de la pantalla en vez de dejarlo envolver. */}
      {acciones && <div className="min-w-0">{acciones}</div>}
    </header>
  );
}
