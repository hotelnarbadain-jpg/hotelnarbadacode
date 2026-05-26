export const TableSkeleton = ({ columns = 5, rows = 5 }) => (
  <div className="card overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-slate-50 border-b border-brand-border">
        <tr>
          {[...Array(columns)].map((_, i) => (
            <th key={i} className="px-6 py-4">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border">
        {[...Array(rows)].map((_, rowIndex) => (
          <tr key={rowIndex} className="animate-pulse">
            {[...Array(columns)].map((_, colIndex) => (
              <td key={colIndex} className="px-6 py-4">
                <div className="h-4 w-full max-w-[120px] bg-slate-200 rounded"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardSkeleton = () => (
  <div className="card p-6 animate-pulse border-slate-100 bg-white">
    <div className="flex items-center justify-between mb-4">
      <div className="h-12 w-12 rounded-2xl bg-slate-200" />
      <div className="flex flex-col items-end gap-2">
        <div className="h-3 w-20 rounded bg-slate-200" />
        <div className="h-6 w-32 rounded bg-slate-300" />
      </div>
    </div>
    <div className="h-5 w-3/4 rounded bg-slate-200 mb-4" />
    <div className="mt-2 space-y-3 border-t border-brand-border pt-4">
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
    </div>
    <div className="mt-6 h-12 w-full rounded-xl bg-slate-200" />
  </div>
);

export const DashboardStatSkeleton = () => (
  <div className="card p-5 animate-pulse bg-white">
    <div className="flex items-center gap-4">
      <div className="h-14 w-14 rounded-2xl bg-slate-200" />
      <div className="flex-1">
        <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
        <div className="h-6 w-32 rounded bg-slate-300" />
      </div>
    </div>
  </div>
);

export const CheckoutSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-2">
    <div className="card p-6 animate-pulse bg-white">
      <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
      <div className="space-y-4">
        <div className="h-14 w-full bg-slate-200 rounded-xl"></div>
        <div className="h-14 w-full bg-slate-200 rounded-xl"></div>
        <div className="h-14 w-full bg-slate-200 rounded-xl"></div>
      </div>
    </div>
    <div className="card p-6 animate-pulse bg-white">
      <div className="h-6 w-32 bg-slate-200 rounded mb-6"></div>
      <div className="space-y-4 mt-8 border-t border-slate-100 pt-4">
        <div className="flex justify-between"><div className="h-4 w-24 bg-slate-200 rounded"></div><div className="h-4 w-20 bg-slate-200 rounded"></div></div>
        <div className="flex justify-between"><div className="h-4 w-24 bg-slate-200 rounded"></div><div className="h-4 w-20 bg-slate-200 rounded"></div></div>
        <div className="flex justify-between"><div className="h-4 w-24 bg-slate-200 rounded"></div><div className="h-4 w-20 bg-slate-200 rounded"></div></div>
      </div>
      <div className="mt-8 h-14 w-full bg-slate-200 rounded-xl"></div>
    </div>
  </div>
);
