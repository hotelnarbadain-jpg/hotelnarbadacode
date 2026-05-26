import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingColumns,
  faPen,
  faTrash,
  faPlus,
  faRightLeft,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CardSkeleton } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

const initialTransactionForm = {
  category: '',
  type: 'Deposit',
  amount: '',
  remarks: '',
};

export default function ReceptionSahakariPage({ api, updateTrigger }) {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState(null);

  // Details & Transactions
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState(null);
  
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState(initialTransactionForm);
  const [editingTxIndex, setEditingTxIndex] = useState(null);

  const loadData = async () => {
    if (accounts.length === 0) setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = await api.fetchList('/sahakari');
      setAccounts(data);

      if (activeAccount) {
        const refreshed = data.find((a) => a._id === activeAccount._id);
        if (refreshed) setActiveAccount(refreshed);
      }
    } catch (e) {
      notifyError('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [updateTrigger]);

  const filteredAccounts = accounts.filter(acc => 
    (acc.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (acc.type || '').toLowerCase().includes(search.toLowerCase())
  );

  const submitTransaction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = Number(txForm.amount || 0);
      const isDeposit = txForm.type === 'Deposit';
      let newBalance = Number(activeAccount.balance || 0);
      let newTransactions = [...(activeAccount.transactions || [])];

      if (editingTxIndex !== null) {
        const oldTx = newTransactions[editingTxIndex];
        const oldAmount = Number(oldTx.amount || 0);
        if (oldTx.type === 'Deposit') newBalance -= oldAmount;
        else newBalance += oldAmount;

        if (isDeposit) newBalance += amount;
        else newBalance -= amount;

        newTransactions[editingTxIndex] = {
          ...oldTx,
          category: txForm.category,
          type: txForm.type,
          amount: amount,
          remarks: txForm.remarks,
        };
      } else {
        if (isDeposit) newBalance += amount;
        else newBalance -= amount;

        newTransactions.push({
          date: new Date(),
          category: txForm.category,
          type: txForm.type,
          amount: amount,
          remarks: txForm.remarks,
        });
      }

      const payload = {
        transactions: newTransactions,
        balance: newBalance,
      };

      const updated = await api.updateItem('/sahakari', activeAccount._id, payload);
      setActiveAccount(updated);
      notifySuccess(editingTxIndex !== null ? 'Transaction updated' : 'Transaction successful');
      setTxModalOpen(false);
      setDetailsModalOpen(true); // Re-open details after success
      setTxForm(initialTransactionForm);
      setEditingTxIndex(null);
      loadData();
    } catch (err) {
      notifyError('Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeTransaction = async (index) => {
    setSubmitting(true);
    try {
      const txs = [...activeAccount.transactions];
      const oldTx = txs[index];
      let newBalance = Number(activeAccount.balance || 0);
      
      const oldAmount = Number(oldTx.amount || 0);
      if (oldTx.type === 'Deposit') newBalance -= oldAmount;
      else newBalance += oldAmount;

      txs.splice(index, 1);

      const payload = { transactions: txs, balance: newBalance };
      const updated = await api.updateItem('/sahakari', activeAccount._id, payload);
      setActiveAccount(updated);
      notifySuccess('Transaction deleted');
      setConfirmDeleteTx(null);
      loadData();
    } catch (err) {
      notifyError('Failed to delete transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[400px]">
      {/* Processing Overlay */}
      {submitting && !txModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]">
          <div className="spinner"></div>
          <p className="text-[13px] font-black uppercase tracking-widest text-brand-muted">Processing Request...</p>
        </div>
      )}

      <PageHeader
        title="Sahakari Transactions"
        subtitle="Manage Deposit & Withdrawal Statements"
        actions={
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
              className="input !pl-11" 
              placeholder="Search Sahakari..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((row) => (
            <div
              key={row._id}
              className="card cursor-pointer p-6 transition-all"
              onClick={() => {
                setActiveAccount(row);
                setDetailsModalOpen(true);
              }}
            >
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-content-center rounded-2xl bg-slate-100 text-[20px] text-brand-muted transition-colors">
                  <FontAwesomeIcon icon={faBuildingColumns} />
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-slate-800 leading-tight uppercase line-clamp-1">{row.name || 'Unnamed Sahakari'}</h3>
                  <span className="mt-1 inline-flex rounded-full bg-blue-100 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-blue">
                    {row.type || 'Standard'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-muted">Statement</p>
                <p className="text-[13px] font-bold text-slate-800 uppercase">{row.transactions?.length || 0} Records</p>
              </div>
            </div>
          ))}
          {filteredAccounts.length === 0 && (
            <div className="col-span-full py-20 text-center text-brand-muted font-black uppercase tracking-widest">
              No sahakari records found.
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION LIST VIEW */}
      <Modal open={detailsModalOpen} title="Transaction Statement" onClose={() => setDetailsModalOpen(false)} width="850px">
        {activeAccount && (
          <div className={`flex flex-col gap-6 transition-all duration-300 ${txModalOpen ? 'blur-[2px] opacity-60 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div>
                  <h2 className="text-[18px] font-black text-slate-800 uppercase leading-none">{activeAccount.name}</h2>
                  <p className="text-[11px] font-bold text-brand-blue uppercase tracking-widest mt-1">{activeAccount.type}</p>
               </div>
               <button className="btn-primary flex items-center gap-2 !px-5" onClick={() => {
                  setEditingTxIndex(null);
                  setTxForm({ ...initialTransactionForm, category: activeAccount.type });
                  setDetailsModalOpen(false); // Hide details
                  setTxModalOpen(true);
               }}>
                  <FontAwesomeIcon icon={faPlus}/> Add Record
               </button>
            </div>

            <div className="rounded-2xl border border-brand-border bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-brand-border">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Notes</th>
                      <th className="px-6 py-4 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] font-bold text-slate-700">
                    {activeAccount.transactions && activeAccount.transactions.length > 0 ? (
                      activeAccount.transactions.map((tx, idx) => (
                         <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                           <td className="px-6 py-4"><span className="uppercase text-[11px]">{tx.category}</span></td>
                           <td className="px-6 py-4">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-black ${tx.type === 'Deposit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {tx.type}
                              </span>
                           </td>
                           <td className={`px-6 py-4 font-black ${tx.type === 'Deposit' ? 'text-green-600' : 'text-blue-600'}`}>Rs. {tx.amount.toLocaleString()}</td>
                           <td className="px-6 py-4 text-brand-muted font-medium italic line-clamp-1">{tx.remarks || '-'}</td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button className="h-8 w-8 grid place-content-center rounded-lg bg-slate-50 text-brand-blue hover:bg-brand-blue hover:text-white transition" onClick={() => {
                                   setEditingTxIndex(idx);
                                   setTxForm({ category: tx.category, type: tx.type, amount: tx.amount, remarks: tx.remarks || '' });
                                   setDetailsModalOpen(false); // Hide details
                                   setTxModalOpen(true);
                               }}><FontAwesomeIcon icon={faPen} className="text-[12px]" /></button>
                               <button className="h-8 w-8 grid place-content-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition" onClick={() => setConfirmDeleteTx(idx)}><FontAwesomeIcon icon={faTrash} className="text-[12px]" /></button>
                             </div>
                           </td>
                         </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest">No transaction statements available</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        )}
      </Modal>

      {/* NEW TRANSACTION FORM */}
      <Modal open={txModalOpen} title={editingTxIndex !== null ? "Edit Transaction" : "New Transaction"} onClose={() => { if(!submitting) { setTxModalOpen(false); setDetailsModalOpen(true); } }} width="420px">
        <div className="relative">
          {submitting && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
               <div className="spinner"></div>
               <p className="text-[13px] font-semibold text-brand-muted">Processing...</p>
             </div>
          )}
          <form className={`grid gap-5 transition-all duration-200 pb-2 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={submitTransaction}>
            <div>
              <label className="label">Deposit Category</label>
              <select className="input font-bold" value={txForm.category} onChange={(e) => setTxForm({...txForm, category: e.target.value})} required>
                <option value={activeAccount?.type || ''}>{activeAccount?.type}</option>
              </select>
            </div>

            <div>
              <label className="label">Transaction Type</label>
              <div className="flex bg-slate-50 border border-brand-border rounded-xl overflow-hidden p-1">
                <button type="button" className={`flex-1 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-lg transition ${txForm.type === 'Deposit' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setTxForm({...txForm, type: 'Deposit'})}>Deposit</button>
                <button type="button" className={`flex-1 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-lg transition ${txForm.type === 'Withdraw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setTxForm({...txForm, type: 'Withdraw'})}>Withdraw</button>
              </div>
            </div>

            <div>
              <label className="label">Amount (Rs.)</label>
              <input type="number" min="0" step="any" className="input font-black text-[16px]" placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({...txForm, amount: e.target.value})} required />
            </div>

            <div>
              <label className="label">Remarks</label>
              <textarea className="input min-h-[80px]" placeholder="Transaction details..." value={txForm.remarks} onChange={(e) => setTxForm({...txForm, remarks: e.target.value})} />
            </div>

            <div className="mt-2 flex gap-3">
               <button type="button" className="btn-secondary flex-1" onClick={() => { setTxModalOpen(false); setDetailsModalOpen(true); }}>Cancel</button>
               <button type="submit" className="btn-primary flex-[2] !h-12 text-[14px]">Confirm Record</button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDeleteTx !== null} message="Permanently delete this transaction record?" onClose={() => setConfirmDeleteTx(null)} onConfirm={() => removeTransaction(confirmDeleteTx)} />
    </div>
  );
}
