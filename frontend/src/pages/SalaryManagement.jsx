import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faPlus, faTrash, faMoneyBillWave, faHistory, faCheckCircle, faPen, faCircleUser } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

const SalarySkeleton = () => (
  <div className="card animate-pulse p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="h-12 w-12 rounded-full bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
      </div>
    </div>
    <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
    <div className="mt-2 h-4 w-1/3 rounded bg-slate-100" />
    <div className="mt-4 space-y-2">
      <div className="h-4 w-1/2 rounded bg-slate-100" />
      <div className="h-4 w-2/3 rounded bg-slate-100" />
    </div>
    <div className="mt-4 h-6 w-24 rounded-full bg-slate-100" />
  </div>
);

const NEPALI_MONTHS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const DEFAULT_YEAR = '2083';

const defaultForm = {
  staffId: '',
  month: 'Baishakh',
  year: DEFAULT_YEAR,
  overtime: '0',
  bonus: '0',
  advance: '0',
  remarks: ''
};

const defaultPayment = {
  paymentMethod: 'Cash',
  paymentDate: '',
  status: 'Paid'
};

export default function SalaryManagement({ api, updateTrigger }) {
  const [items, setItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDownload, setConfirmDownload] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [paymentForm, setPaymentForm] = useState(defaultPayment);

  const loadData = async () => {
    if (items.length === 0) setLoading(true);
    try {
      const [salaries, staff] = await Promise.all([
        api.fetchList('/salary'),
        api.fetchList('/staff')
      ]);
      setItems(salaries);
      setStaffList(staff.filter(s => s.role !== 'Admin' && s.role !== 'Customer'));
    } catch (err) {
      notifyError('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [updateTrigger]);

  const filteredItems = useMemo(() => {
    if (!filterStatus) return items;
    return items.filter(s => s.status === filterStatus);
  }, [items, filterStatus]);

  const selectedStaff = staffList.find(s => s._id === form.staffId);
  const baseSalary = selectedStaff?.salary || 0;
  const netSalary = baseSalary + parseFloat(form.overtime || '0') + parseFloat(form.bonus || '0') - parseFloat(form.advance || '0');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.staffId) return notifyError('Please select a staff member');
    setSubmitting(true);
    try {
      const payload = {
        staff: form.staffId,
        baseSalary,
        overtime: parseFloat(form.overtime || '0'),
        bonus: parseFloat(form.bonus || '0'),
        advance: parseFloat(form.advance || '0'),
        netSalary,
        month: form.month,
        year: form.year,
        remarks: form.remarks
      };

      if (editingId) {
        await api.updateItem('/salary', editingId, payload);
        notifySuccess('Salary record updated successfully');
      } else {
        await api.createItem('/salary', payload);
        notifySuccess('Salary record generated successfully');
      }
      setGenerateModalOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to process record');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (salary) => {
    setEditingId(salary._id);
    setForm({
      staffId: salary.staff?._id || '',
      month: salary.month,
      year: salary.year,
      overtime: salary.overtime.toString(),
      bonus: salary.bonus.toString(),
      advance: salary.advance.toString(),
      remarks: salary.remarks || ''
    });
    setGenerateModalOpen(true);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedRecord) return;
    try {
      const updated = await api.updateItem('/salary', selectedRecord._id, { status });
      notifySuccess(`Status updated to ${status}`);
      // Preserve the staff object since the backend returns a non-populated record
      setSelectedRecord({ ...updated, staff: selectedRecord.staff });
      loadData();
    } catch (err) {
      notifyError('Failed to update status');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const updated = await api.updateItem('/salary', selectedRecord._id, {
        ...paymentForm,
        status: 'Paid'
      });
      notifySuccess('Payment recorded successfully');
      setSelectedRecord({ ...updated, staff: selectedRecord.staff });
      setPaymentModalOpen(false);
      setDetailModalOpen(false);
      loadData();
    } catch (err) {
      notifyError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteItem('/salary', confirmDelete._id);
      notifySuccess('Record deleted');
      setConfirmDelete(null);
      setDetailModalOpen(false);
      loadData();
    } catch (err) {
      notifyError('Failed to delete record');
    }
  };

  const downloadCsv = () => {
    if (items.length === 0) return notifyError('No records to export');
    const headers = ['Staff Name', 'Role', 'Month', 'Year', 'Base Salary', 'Overtime', 'Bonus', 'Advance', 'Net Salary', 'Status'];
    const csvRows = [
      headers.join(','),
      ...items.map(s => [
        s.staff?.name || 'N/A',
        s.staff?.role || 'N/A',
        s.month,
        s.year,
        s.baseSalary,
        s.overtime,
        s.bonus,
        s.advance,
        s.netSalary,
        s.status
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Salary_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
    setConfirmDownload(false);
  };

  return (
    <div>
      <PageHeader
        title="Salary Management"
        actions={
          <>
            <button className="btn-success" onClick={() => setConfirmDownload(true)}>
              <FontAwesomeIcon icon={faDownload} /> Download CSV
            </button>
            <button className="btn-primary" onClick={() => { setEditingId(null); setForm(defaultForm); setGenerateModalOpen(true); }}>
              <FontAwesomeIcon icon={faPlus} /> Generate Salary
            </button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-2">
        {['', 'Pending', 'Approved', 'Paid', 'Hold'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${filterStatus === status ? 'bg-brand-navy text-white shadow-soft' : 'bg-white border text-brand-muted hover:bg-slate-50'}`}
          >
            {status || 'All Records'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <SalarySkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredItems.map(salary => (
            <div 
              key={salary._id} 
              className="card group cursor-pointer p-5 transition-all hover:border-brand-blue"
              onClick={() => {
                setSelectedRecord(salary);
                setDetailModalOpen(true);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-content-center rounded-full bg-brand-soft text-brand-blue">
                  <FontAwesomeIcon icon={faMoneyBillWave} />
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn-secondary !h-9 !px-3" 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(salary);
                    }}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button 
                    className="btn-danger !h-9" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(salary);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
              <h3 className="mt-4 text-[18px] font-bold">{salary.staff?.name || 'Unknown Staff'}</h3>
              <p className="mt-1 text-[13px] text-brand-muted">{salary.month} {salary.year}</p>
              <p className="mt-2 text-[13px]">Base: Rs. {salary.baseSalary.toLocaleString()}</p>
              <p className="text-[13px] font-bold text-green-600">Net: Rs. {salary.netSalary.toLocaleString()}</p>
              <span 
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                  salary.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                  salary.status === 'Approved' ? 'bg-blue-100 text-blue-700' : 
                  salary.status === 'Hold' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {salary.status}
              </span>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center text-brand-muted">
              <FontAwesomeIcon icon={faHistory} size="3x" className="mb-4 opacity-10" />
              <p>No salary records found matching this filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Generate / Edit Salary Modal */}
      <Modal open={generateModalOpen} title={editingId ? 'Update Salary Record' : 'Generate Monthly Salary'} onClose={() => !submitting && setGenerateModalOpen(false)} width="640px">
        <form onSubmit={handleGenerate} className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div><p className="text-[13px] font-semibold text-brand-muted">Processing...</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Select Staff</label>
              <select
                className="input font-bold"
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                required
                disabled={!!editingId}
              >
                <option value="">-- SEARCH STAFF MEMBER --</option>
                {staffList.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
              </select>
            </div>

            <div className="rounded-xl border border-brand-border bg-slate-50 p-3">
              <label className="text-[10px] font-bold uppercase text-brand-muted">Staff Role</label>
              <p className="font-bold text-brand-navy">{selectedStaff?.role || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-brand-border bg-slate-50 p-3">
              <label className="text-[10px] font-bold uppercase text-brand-muted">Base Salary</label>
              <p className="font-bold text-brand-blue">Rs. {baseSalary.toLocaleString()}</p>
            </div>

            <div>
              <label className="label">Salary Month (Nepali)</label>
              <select className="input font-bold" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                {NEPALI_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year (BS)</label>
              <input className="input font-bold" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
            </div>

            <div className="md:col-span-2 border-t border-brand-border pt-2"></div>

            <div>
              <label className="label">Overtime (Rs)</label>
              <input type="number" className="input font-bold" value={form.overtime} onChange={(e) => setForm({ ...form, overtime: e.target.value })} />
            </div>
            <div>
              <label className="label">Bonus / Allowance (Rs)</label>
              <input type="number" className="input font-bold" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
            </div>
            <div>
              <label className="label">Advance / Deduction (Rs)</label>
              <input type="number" className="input font-bold text-rose-600" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} />
            </div>
            <div>
              <label className="label">Calculated Net Pay</label>
              <div className="rounded-xl border border-green-100 bg-green-50 p-2 text-center text-[18px] font-black text-green-700">
                Rs. {netSalary.toLocaleString()}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">Additional Remarks</label>
              <input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Any specific notes..." />
            </div>

            <div className="md:col-span-2 mt-4 flex justify-end gap-3 border-t border-brand-border pt-4">
              <button type="button" className="btn-secondary" onClick={() => setGenerateModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {editingId ? 'Update Record' : 'Generate Record'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail View Modal (Summary Only) */}
      <Modal open={detailModalOpen} title="Salary Record Summary" onClose={() => setDetailModalOpen(false)} width="560px">
        {selectedRecord && (
          <div className="relative p-2">
            <div className="mb-6 rounded-2xl bg-brand-soft p-4 flex flex-col items-center text-center">
              <div className="grid h-12 w-12 place-content-center rounded-full bg-white text-brand-blue shadow-sm mb-2">
                <FontAwesomeIcon icon={faMoneyBillWave} />
              </div>
              <h3 className="text-[18px] font-bold text-brand-navy">{selectedRecord.staff?.name || 'N/A'}</h3>
              <p className="text-[12px] font-bold uppercase tracking-widest text-brand-blue">{selectedRecord.staff?.role || 'N/A'}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-brand-border p-4 bg-slate-50/50">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block mb-1">Payment Period</label>
                <p className="text-[16px] font-bold text-brand-navy">{selectedRecord.month} {selectedRecord.year}</p>
              </div>
              
              <div className="rounded-xl border border-brand-border p-4 bg-slate-50/50 text-right">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block mb-1">Current Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-black uppercase ${
                    selectedRecord.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                    selectedRecord.status === 'Approved' ? 'bg-blue-100 text-blue-700' : 
                    selectedRecord.status === 'Hold' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {selectedRecord.status}
                </span>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-brand-muted font-medium">Base Salary</span>
                  <span className="font-bold text-brand-navy">Rs. {selectedRecord.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-brand-muted font-medium">Overtime</span>
                  <span className="font-bold text-brand-blue">+ Rs. {selectedRecord.overtime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-brand-muted font-medium">Bonus / Allowances</span>
                  <span className="font-bold text-brand-blue">+ Rs. {selectedRecord.bonus.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-brand-muted font-medium">Advance / Deductions</span>
                  <span className="font-bold text-rose-600">- Rs. {selectedRecord.advance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-4 text-[20px]">
                  <span className="font-black text-brand-navy text-[16px] uppercase tracking-widest">Net Payable</span>
                  <span className="font-black text-green-600">Rs. {selectedRecord.netSalary.toLocaleString()}</span>
                </div>
              </div>

              {selectedRecord.remarks && (
                <div className="md:col-span-2 rounded-xl bg-amber-50 p-4 border border-amber-100">
                  <label className="text-[10px] font-bold uppercase text-amber-600 block mb-1">Remarks</label>
                  <p className="text-[13px] text-amber-900 font-medium italic">{selectedRecord.remarks}</p>
                </div>
              )}

              {selectedRecord.status === 'Paid' && selectedRecord.paymentMethod && (
                <div className="md:col-span-2 rounded-xl border-t-4 border-green-600 bg-white p-4 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 grid place-content-center text-green-600">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <div className="flex-1 grid grid-cols-2">
                    <div><span className="text-[10px] font-bold uppercase text-brand-muted block">Method</span><p className="font-bold text-brand-navy">{selectedRecord.paymentMethod}</p></div>
                    <div className="text-right"><span className="text-[10px] font-bold uppercase text-brand-muted block">Paid Date</span><p className="font-bold text-brand-navy">{selectedRecord.paymentDate}</p></div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-brand-border">
                {selectedRecord.status === 'Pending' && (
                  <button className="btn-primary !h-9 text-[12px]" onClick={() => handleUpdateStatus('Approved')}>Approve Now</button>
                )}
                {selectedRecord.status === 'Approved' && (
                  <button className="btn-success !h-9 text-[12px]" onClick={() => { setPaymentModalOpen(true); setDetailModalOpen(false); }}>
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" /> Release Payment
                  </button>
                )}
                {selectedRecord.status !== 'Paid' && selectedRecord.status !== 'Hold' && (
                  <button className="btn-danger !h-9 text-[12px]" onClick={() => handleUpdateStatus('Hold')}>Put on Hold</button>
                )}
                 {selectedRecord.status === 'Hold' && (
                  <button className="btn-secondary !h-9 text-[12px]" onClick={() => handleUpdateStatus('Pending')}>Restore to Pending</button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Release Payment Modal */}
      <Modal open={paymentModalOpen} title="Release Payment" onClose={() => setPaymentModalOpen(false)} width="440px">
        <form onSubmit={handlePayment} className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div><p className="text-[13px] font-semibold text-brand-muted">Processing...</p>
            </div>
          )}
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-green-100 bg-green-50 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Total Net Amount</span>
              <p className="text-[28px] font-black text-green-700">Rs. {selectedRecord?.netSalary.toLocaleString() || '0'}</p>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input font-bold" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                <option value="Cash">Cash Disbursement</option>
                <option value="Bank Transfer">Direct Bank Transfer</option>
                <option value="Online">Online / Digital Payment</option>
              </select>
            </div>
            <div>
              <label className="label">Release Date (BS)</label>
              <input className="input font-bold" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})} placeholder="2083-01-01" required />
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-brand-border pt-4">
              <button type="button" className="btn-secondary" onClick={() => { setPaymentModalOpen(false); setDetailModalOpen(true); }}>Back</button>
              <button type="submit" className="btn-success" disabled={submitting}>Release Now</button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDownload}
        title="Confirm CSV Download"
        message="Are you sure you want to download the salary details report as CSV?"
        confirmText="Download"
        confirmClass="btn-success"
        onClose={() => setConfirmDownload(false)}
        onConfirm={downloadCsv}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        message={`Delete salary record for ${confirmDelete?.staff?.name}? This action cannot be undone.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
