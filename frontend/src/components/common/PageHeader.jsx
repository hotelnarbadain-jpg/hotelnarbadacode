export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-[20px] font-extrabold tracking-tight md:text-[22px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
