import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess } from '../utils/notify.jsx';
import { 
  ResponsiveContainer, 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  LineChart, Line, CartesianGrid 
} from 'recharts';

const initialForm = { title: '', amount: '', type: 'Income', date: new Date().toISOString().slice(0, 10) };

export default function FinancialPage({ api, updateTrigger }) {
  const [tab, setTab] = useState('summary');
  const [rows, setRows] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (rows.length === 0) setLoading(true);
    const [financials, purchaseRows, salaryRows] = await Promise.all([
      api.fetchList('/financials'),
      api.fetchList('/purchases'),
      api.fetchList('/salary'),
    ]);
    setRows(financials);
    setPurchases(purchaseRows);
    setSalaries(salaryRows.filter(s => s.status === 'Paid'));
    setLoading(false);
  };
  useEffect(() => { load(); }, [updateTrigger]);

  const chartData = useMemo(() => {
    const dailyData = {};

    // Process manual entries
    rows.forEach(row => {
      const date = new Date(row.date).toISOString().slice(0, 10);
      if (!dailyData[date]) dailyData[date] = { date, income: 0, expense: 0 };
      if (row.type === 'Income') dailyData[date].income += Number(row.amount || 0);
      else dailyData[date].expense += Number(row.amount || 0);
    });

    // Process purchases (Expense)
    purchases.forEach(p => {
      const date = new Date(p.date).toISOString().slice(0, 10);
      if (!dailyData[date]) dailyData[date] = { date, income: 0, expense: 0 };
      dailyData[date].expense += Number(p.totalAmount || 0);
    });

    // Process salaries (Expense)
    salaries.forEach(s => {
      if (s.paidDate) {
        const date = new Date(s.paidDate).toISOString().slice(0, 10);
        if (!dailyData[date]) dailyData[date] = { date, income: 0, expense: 0 };
        dailyData[date].expense += Number(s.netSalary || 0);
      }
    });

    const timeline = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    
    const totalIncome = timeline.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = timeline.reduce((sum, d) => sum + d.expense, 0);

    const pieData = [
      { name: 'Total Income', value: totalIncome, color: '#10b981' },
      { name: 'Total Expense', value: totalExpense, color: '#f43f5e' },
    ];

    return { timeline, pieData, totalIncome, totalExpense };
  }, [rows, purchases, salaries]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const payload = { ...form, amount: Number(form.amount || 0) };
    if (editing) {
      await api.updateItem('/financials', editing._id, payload);
      notifySuccess('Bill updated successfully');
    } else {
      await api.createItem('/financials', payload);
      notifySuccess('Bill created successfully');
    }
    setSubmitting(false);
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
    load();
  };

  const remove = async () => {
    await api.deleteItem('/financials', confirmDelete._id);
    notifySuccess('Bill deleted successfully');
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <PageHeader 
        title="Financial Management" 
        actions={
          <div className="flex gap-2">
            <button className={`tab-btn ${tab === 'summary' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border'}`} onClick={() => setTab('summary')}>Summary</button>
            <button className={`tab-btn ${tab === 'statements' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border'}`} onClick={() => setTab('statements')}>Statements</button>
            <button className="btn-primary" onClick={() => { setEditing(null); setForm(initialForm); setModalOpen(true); }}><FontAwesomeIcon icon={faPlus} /> Add Entry</button>
          </div>
        } 
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5 border-l-4 border-l-green-500 shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Total Income</p>
          <h3 className="mt-2 text-[30px] font-black text-green-600 tracking-tight">Rs. {chartData.totalIncome.toLocaleString()}</h3>
        </div>
        <div className="card p-5 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Total Expense</p>
          <h3 className="mt-2 text-[30px] font-black text-rose-600 tracking-tight">Rs. {chartData.totalExpense.toLocaleString()}</h3>
        </div>
        <div className="card p-5 border-l-4 border-l-brand-blue shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Net Cashflow</p>
          <h3 className={`mt-2 text-[30px] font-black tracking-tight ${chartData.totalIncome - chartData.totalExpense >= 0 ? 'text-brand-text' : 'text-rose-600'}`}>
            Rs. {(chartData.totalIncome - chartData.totalExpense).toLocaleString()}
          </h3>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === 'summary' ? (
        <div className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-1 p-6">
              <h4 className="mb-6 text-[15px] font-bold uppercase tracking-widest text-brand-muted">Income vs Expense</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      innerRadius={0}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `Rs. ${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card lg:col-span-2 p-6">
              <h4 className="mb-6 text-[15px] font-bold uppercase tracking-widest text-brand-muted">Financial Trends (Line)</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `Rs. ${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} name="Expense" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="mb-6 text-[15px] font-bold uppercase tracking-widest text-brand-muted">Daily Comparison (Bar)</h4>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value) => `Rs. ${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="top" align="right" iconType="rect" />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" barSize={20} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-6 py-4 border-b border-brand-border flex justify-between items-center">
            <h4 className="text-[15px] font-bold uppercase tracking-widest text-brand-muted">Financial Statements</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead className="bg-slate-50 text-brand-muted">
                <tr>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="font-semibold">Date</th>
                  <th className="font-semibold">Type</th>
                  <th className="font-semibold">Amount</th>
                  <th className="p-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-brand-border hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium">{row.title}</td>
                    <td>{new Date(row.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                        {row.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-black text-brand-text">Rs. {row.amount.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-secondary !h-9 !px-3"
                          onClick={() => {
                            setEditing(row);
                            setForm({ ...row, amount: row.amount || '', date: row.date?.slice(0, 10) || '' });
                            setModalOpen(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button className="btn-danger !h-9" onClick={() => setConfirmDelete(row)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <div className="py-20 text-center text-brand-muted">No financial entries found.</div>}
        </div>
      )}
      <Modal open={modalOpen} title={editing ? 'Update Bill' : 'Create Bill'} onClose={() => !submitting && setModalOpen(false)} width="520px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editing ? 'Updating bill...' : 'Creating bill...'}
              </p>
            </div>
          )}
          <form className={`grid gap-4 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={submit}>
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="label">Amount</label><input className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Income</option><option>Expense</option></select></div>
            </div>
            <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Bill' : 'Save Bill'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmDelete} message={`Delete ${confirmDelete?.title}?`} onClose={() => setConfirmDelete(null)} onConfirm={remove} />
    </div>
  );
}
