export default function StatCard({ icon, label, value, subvalue, accent = 'border-l-blue-500' }) {
  return (
    <div className={`card border-l-4 ${accent} p-5`}>
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-content-center rounded-full bg-brand-soft text-lg">{icon}</div>
        <div>
          <p className="text-[12px] text-brand-muted">{label}</p>
          <h3 className="stat-value">{value}</h3>
          {subvalue ? <p className="text-[12px] text-brand-muted">{subvalue}</p> : null}
        </div>
      </div>
    </div>
  );
}
