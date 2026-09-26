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
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {acciones && <div className="shrink-0">{acciones}</div>}
    </header>
  );
}
