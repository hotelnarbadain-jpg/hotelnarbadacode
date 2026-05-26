import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingColumns,
  faPen,
  faPlus,
  faTrash,
  faRightLeft,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

const SahakariSkeleton = () => (
  <div className="card animate-pulse p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="h-16 w-16 rounded-full bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded bg-slate-200" />
        <div className="h-8 w-8 rounded bg-slate-200" />
      </div>
    </div>
    <div className="mt-5 h-7 w-3/4 rounded bg-slate-200" />
    <div className="mt-2 h-6 w-24 rounded bg-slate-100" />
    <div className="mt-5 h-4 w-1/2 rounded bg-slate-100" />
    <div className="mt-2 h-9 w-2/3 rounded bg-slate-200" />
  </div>
);

const initialAccountForm = {
  name: '',
  type: '',
  address: '',
  contactPerson: '',
  contactNo: '',
  accountNo: '',
  balance: '',
};

const initialCategoryForm = {
  name: '',
};

const initialTransactionForm = {
  category: '',
  type: 'Deposit',
  amount: '',
  remarks: '',
};

export default function SahakariPage({ api, updateTrigger }) {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [depositTypes, setDepositTypes] = useState([]);

  // Modals & States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Accounts Form
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [accountForm, setAccountForm] = useState(initialAccountForm);

  // Deposit Types Form
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);

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
      const [accs, cats] = await Promise.all([
        api.fetchList('/sahakari'),
        api.fetchList('/deposit-types'),
      ]);
      setAccounts(accs);
      setDepositTypes(cats);

      // Refresh active account if open
      if (activeAccount) {
        const refreshed = accs.find((a) => a._id === activeAccount._id);
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

  // --- ACCOUNT HANDLERS ---
  const openAccountCreate = () => {
    setEditingAccountId(null);
    setAccountForm({ ...initialAccountForm, type: depositTypes[0]?.name || '' });
    setAccountModalOpen(true);
  };

  const openAccountEdit = (acc) => {
    setEditingAccountId(acc._id);
    setAccountForm({
      name: acc.name || '',
      type: acc.type || depositTypes[0]?.name || '',
      address: acc.address || '',
      contactPerson: acc.contactPerson || '',
      contactNo: acc.contactNo || '',
      accountNo: acc.accountNo || '',
      balance: acc.balance || 0,
    });
    setAccountModalOpen(true);
  };

  const submitAccount = (event) => {
    event.preventDefault();
    if (accountForm.contactNo && accountForm.contactNo.length !== 10) return notifyError('Contact number must be 10 digits');
    setShowConfirmSubmit(true);
  };

  const handleActualAccountSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    const payload = { ...accountForm, balance: Number(accountForm.balance || 0) };
    try {
      if (editingAccountId) {
        await api.updateItem('/sahakari', editingAccountId, payload);
        notifySuccess('Sahakari updated successfully');
      } else {
        await api.createItem('/sahakari', payload);
        notifySuccess('Sahakari created successfully');
      }
      setAccountModalOpen(false);
      loadData();
    } catch (err) {
      notifyError('Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAccount = async () => {
    setSubmitting(true);
    try {
      await api.deleteItem('/sahakari', confirmDelete._id);
      notifySuccess('Sahakari deleted successfully');
      setDetailsModalOpen(false); // close if open
    } catch {
      notifyError('Failed to delete Sahakari');
    }
    setConfirmDelete(null);
    loadData();
    setSubmitting(false);
  };

  // --- DEPOSIT TYPE CATEGORY HANDLERS ---
  const submitCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...categoryForm };
    try {
      if (editingCategoryId) {
        await api.updateItem('/deposit-types', editingCategoryId, payload);
        notifySuccess('Deposit type updated');
      } else {
        await api.createItem('/deposit-types', payload);
        notifySuccess('Deposit type created');
      }
      setCategoryModalOpen(false);
      loadData();
    } catch {
      notifyError('Failed to save deposit type');
    } finally {
      setSubmitting(false);
    }
  };

  const removeCategory = async () => {
    setSubmitting(true);
    try {
      await api.deleteItem('/deposit-types', confirmDelete._id);
      notifySuccess('Category deleted');
    } catch {
      notifyError('Failed to delete category');
    }
    setConfirmDelete(null);
    loadData();
    setSubmitting(false);
  };

  // --- TRANSACTIONS ---
  const submitTransaction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = Number(txForm.amount || 0);
      const isDeposit = txForm.type === 'Deposit';
      let newBalance = Number(activeAccount.balance || 0);
      let newTransactions = [...(activeAccount.transactions || [])];

      if (editingTxIndex !== null) {
        // Revert old transaction effect
        const oldTx = newTransactions[editingTxIndex];
        const oldAmount = Number(oldTx.amount || 0);
        if (oldTx.type === 'Deposit') newBalance -= oldAmount;
        else newBalance += oldAmount;

        // Apply new effect
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
        // New transaction
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

  // --- RENDER HELPERS ---
  const renderAccounts = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((row) => (
        <div
          key={row._id}
          className="card cursor-pointer p-6 transition-all hover:border-brand-blue hover:shadow-lg"
          onClick={() => {
            setActiveAccount(row);
            setDetailsModalOpen(true);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-16 w-16 place-content-center rounded-full bg-slate-100 text-[20px] text-brand-muted">
              <FontAwesomeIcon icon={faBuildingColumns} />
            </div>
            <div className="flex gap-2">
              <button className="grid h-8 w-8 place-content-center rounded bg-slate-100 text-brand-blue hover:bg-slate-200 transition" onClick={(e) => { e.stopPropagation(); openAccountEdit(row); }}>
                <FontAwesomeIcon icon={faPen} className="text-[14px]" />
              </button>
              <button className="grid h-8 w-8 place-content-center rounded bg-rose-50 text-rose-500 hover:bg-rose-100 transition" onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }}>
                <FontAwesomeIcon icon={faTrash} className="text-[14px]" />
              </button>
            </div>
          </div>
          <h3 className="mt-5 text-[20px] font-bold leading-tight line-clamp-2">{row.name}</h3>
          <span className="mt-2 inline-flex rounded bg-blue-100 px-3 py-1 text-[12px] font-semibold text-brand-blue">
            {row.type}
          </span>
          <p className="mt-5 text-[14px] text-slate-500 font-semibold tracking-wide">
            A/C: <span className="text-brand-text">{row.accountNo || 'N/A'}</span>
          </p>
          <p className="mt-2 text-[26px] font-extrabold text-brand-blue">
            Rs. {(row.balance || 0).toLocaleString()}
          </p>
        </div>
      ))}
      {accounts.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted">No sahakari records found.</div>}
    </div>
  );

  const renderCategories = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {depositTypes.map((cat) => (
        <div key={cat._id} className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-bold uppercase text-brand-text">{cat.name}</h3>
            <div className="flex gap-2">
              <button
                className="btn-secondary !h-8 !px-3 font-semibold text-brand-blue hover:bg-blue-50"
                onClick={() => {
                  setEditingCategoryId(cat._id);
                  setCategoryForm({ name: cat.name, rate: cat.rate || '', description: cat.description || '' });
                  setCategoryModalOpen(true);
                }}
              >
                Edit
              </button>
              <button
                className="btn-danger !h-8 font-semibold"
                onClick={() => setConfirmDelete({ ...cat, isCategory: true })}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-brand-border pt-4"></div>
        </div>
      ))}
      {depositTypes.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted">No categories exist yet.</div>}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Sahakari Management"
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              if (tab === 'accounts') openAccountCreate();
              else { setEditingCategoryId(null); setCategoryForm(initialCategoryForm); setCategoryModalOpen(true); }
            }}
          >
            <FontAwesomeIcon icon={faPlus} /> {tab === 'accounts' ? 'Register Sahakari' : 'Create Deposit Type'}
          </button>
        }
      />

      {/* TABS */}
      <div className="mb-6 flex gap-8 border-b border-brand-border text-[13px] font-semibold">
        <button
          className={`border-b-2 pb-3 transition-colors ${tab === 'accounts' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
          onClick={() => setTab('accounts')}
        >
          SAHAKARI ACCOUNTS
        </button>
        <button
          className={`border-b-2 pb-3 transition-colors ${tab === 'deposit-types' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-muted hover:text-brand-text'}`}
          onClick={() => setTab('deposit-types')}
        >
          DEPOSIT TYPES
        </button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SahakariSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>{tab === 'accounts' ? renderAccounts() : renderCategories()}</>
      )}

      {/* =========================================
          MODAL: SAHAKARI ACCOUNT (CREATE/EDIT)
          ========================================= */}
      <Modal open={accountModalOpen} title={editingAccountId ? 'Update Sahakari' : 'Register Sahakari'} onClose={() => !submitting && setAccountModalOpen(false)} width="720px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">{editingAccountId ? 'Updating account...' : 'Registering account...'}</p>
            </div>
          )}
          <form onSubmit={submitAccount} className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${(submitting || showConfirmSubmit) ? 'pointer-events-none blur-[2px]' : ''}`}>
            <div>
              <label className="label">Sahakari Name *</label>
              <input className="input" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Deposit Type *</label>
              <select className="input" value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })} required>
                <option value="" disabled>Select Deposit Type</option>
                {depositTypes.map(dt => <option key={dt._id} value={dt.name}>{dt.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="label">Account Number</label>
              <input className="input" value={accountForm.accountNo} onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })} />
            </div>
            <div>
              <label className="label">Initial Balance</label>
              <input className="input" type="number" min="0" step="any" value={accountForm.balance} onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={accountForm.address} onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })} />
            </div>
            
            <div>
              <label className="label">Contact Person</label>
              <input className="input" value={accountForm.contactPerson} onChange={(e) => setAccountForm({ ...accountForm, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact No</label>
              <input className="input" value={accountForm.contactNo} onChange={(e) => setAccountForm({ ...accountForm, contactNo: e.target.value })} />
              {accountForm.contactNo && accountForm.contactNo.length !== 10 && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
              )}
            </div>

            <div className="md:col-span-2 mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" className="btn-secondary" onClick={() => setAccountModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingAccountId ? 'Update Sahakari' : 'Save Sahakari'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =========================================
          MODAL: DEPOSIT CATEGORY (CREATE/EDIT)
          ========================================= */}
      <Modal open={categoryModalOpen} title={editingCategoryId ? 'Update Category' : 'Create Deposit Type'} onClose={() => !submitting && setCategoryModalOpen(false)} width="480px">
        <div className="relative">
          {submitting && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
               <div className="spinner"></div>
               <p className="text-[13px] font-semibold text-brand-muted">Saving...</p>
             </div>
          )}
          <form onSubmit={submitCategory} className={`grid gap-4 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`}>
            <div>
              <label className="label">Category Name</label>
              <input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setCategoryModalOpen(false)}>Cancel</button>
              <button className="btn-primary" type="submit">Save Category</button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =========================================
          MODAL: SAHAKARI DETAILS VIEW
          ========================================= */}
      <Modal open={detailsModalOpen} title="Sahakari Details" onClose={() => setDetailsModalOpen(false)} width="800px">
        {activeAccount && (
          <div className="flex flex-col gap-8 pb-4">
            
            {/* Top Info Grid */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px,1fr]">
              {/* Left Column */}
              <div className="flex flex-col items-center md:items-start">
                <div className="grid h-[150px] w-[150px] place-content-center rounded-full bg-slate-100 border-[8px] border-slate-50 text-[50px] text-brand-muted">
                  <FontAwesomeIcon icon={faBuildingColumns} />
                </div>
                <h2 className="mt-5 text-center md:text-left text-[20px] font-black leading-tight text-brand-text">{activeAccount.name}</h2>
                <div className="mt-2 text-center md:text-left font-bold text-brand-blue">{activeAccount.type}</div>
                
                <div className="mt-6 w-full rounded-2xl bg-[#F0F5FF] p-5 text-center">
                   <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest leading-none mb-3">Total Balance</p>
                   <p className="text-[24px] font-black text-brand-blue tracking-tight leading-none">Rs. {(activeAccount.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col pt-2">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-muted">A/C Number</p>
                    <p className="mt-2 font-bold text-[16px] text-slate-800">{activeAccount.accountNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-muted">Contact No</p>
                    <p className="mt-2 font-bold text-[16px] text-slate-800">{activeAccount.contactNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-muted">Contact Person</p>
                    <p className="mt-2 font-bold text-[16px] text-slate-800">{activeAccount.contactPerson || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-muted">Address</p>
                    <p className="mt-2 font-bold text-[16px] text-slate-800">{activeAccount.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="font-bold flex items-center gap-2 text-[15px]"><FontAwesomeIcon icon={faRightLeft} className="text-brand-blue"/> Transaction Statement</h4>
              </div>

              <div className="rounded-xl border border-brand-border bg-white overflow-hidden text-[12px]">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Category</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Remarks</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-700">
                    {activeAccount.transactions && activeAccount.transactions.length > 0 ? (
                      activeAccount.transactions.map((tx, idx) => (
                         <tr key={idx} className="border-t border-brand-border">
                           <td className="px-5 py-4">{new Date(tx.date).toLocaleDateString()}</td>
                           <td className="px-5 py-4">{tx.category}</td>
                           <td className={`px-5 py-4 font-bold ${tx.type === 'Deposit' ? 'text-green-600' : 'text-rose-600'}`}>{tx.type}</td>
                           <td className="px-5 py-4 font-bold">Rs. {tx.amount.toLocaleString()}</td>
                           <td className="px-5 py-4 text-brand-muted">{tx.remarks || '-'}</td>
                           <td className="px-5 py-4 text-right">
                             <div className="flex items-center justify-end gap-3 text-[14px]">
                               <button
                                 className="text-brand-blue hover:text-blue-700 transition"
                                 onClick={() => {
                                   setEditingTxIndex(idx);
                                   setTxForm({
                                     category: tx.category,
                                     type: tx.type,
                                     amount: tx.amount,
                                     remarks: tx.remarks || '',
                                   });
                                   setTxModalOpen(true);
                                 }}
                               >
                                 <FontAwesomeIcon icon={faPen} />
                               </button>
                               <button
                                 className="text-rose-500 hover:text-rose-700 transition"
                                 onClick={() => setConfirmDeleteTx(idx)}
                               >
                                 <FontAwesomeIcon icon={faTrash} />
                               </button>
                             </div>
                           </td>
                         </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold tracking-wide">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end pt-6 border-t border-brand-border mt-4">
              <button className="btn-primary flex items-center gap-2 !px-6" onClick={() => {
                 setEditingTxIndex(null);
                 setTxForm({ ...initialTransactionForm, category: activeAccount.type });
                 setTxModalOpen(true);
              }}>
                <FontAwesomeIcon icon={faRightLeft}/> New Transaction
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* =========================================
          MODAL: NEW TRANSACTION
          ========================================= */}
      <Modal open={txModalOpen} title="New Transaction" onClose={() => !submitting && setTxModalOpen(false)} width="400px">
        <div className="relative">
          {submitting && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
               <div className="spinner"></div>
               <p className="text-[13px] font-semibold text-brand-muted">Processing...</p>
             </div>
          )}
          <form className={`grid gap-5 transition-all duration-200 pb-2 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={submitTransaction}>
            
            {/* Deposit Category */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 tracking-widest uppercase mb-2 block">Deposit Category</label>
              <select className="input font-medium" value={txForm.category} onChange={(e) => setTxForm({...txForm, category: e.target.value})} required>
                <option value={activeAccount?.type || ''}>{activeAccount?.type}</option>
              </select>
            </div>

            {/* Type Toggle */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 tracking-widest uppercase mb-2 block">Transaction Type</label>
              <div className="flex bg-slate-50 border border-brand-border rounded-lg overflow-hidden p-[3px]">
                <button 
                  type="button" 
                  className={`flex-1 py-3 text-[14px] font-black tracking-wide rounded-md transition ${txForm.type === 'Deposit' ? 'bg-[#10B981] text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                  onClick={() => setTxForm({...txForm, type: 'Deposit'})}
                >
                  Deposit
                </button>
                <button 
                  type="button" 
                  className={`flex-1 py-3 text-[14px] font-black tracking-wide rounded-md transition ${txForm.type === 'Withdraw' ? 'bg-[#3B82F6] text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                  onClick={() => setTxForm({...txForm, type: 'Withdraw'})}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 tracking-widest uppercase mb-2 block">Amount</label>
              <input type="number" min="0" step="any" className="input text-[16px]" placeholder="0.00" value={txForm.amount} onChange={(e) => setTxForm({...txForm, amount: e.target.value})} required />
            </div>

            {/* Remarks */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 tracking-widest uppercase mb-2 block">Remarks</label>
              <input type="text" className="input" placeholder="Optional notes" value={txForm.remarks} onChange={(e) => setTxForm({...txForm, remarks: e.target.value})} />
            </div>

            {/* Submit */}
            <button type="submit" className="btn-primary w-full !h-12 text-[16px] mt-2">
              Confirm Transaction
            </button>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Delete this ${confirmDelete?.isCategory ? 'Category' : 'Account'}?`} onClose={() => setConfirmDelete(null)} onConfirm={confirmDelete?.isCategory ? removeCategory : removeAccount} />
      <ConfirmDialog open={confirmDeleteTx !== null} message="Delete this transaction?" onClose={() => setConfirmDeleteTx(null)} onConfirm={() => removeTransaction(confirmDeleteTx)} />

      <ConfirmDialog
        open={showConfirmSubmit}
        title="Confirm Sahakari Save"
        message={`Are you sure you want to ${editingAccountId ? 'update' : 'register'} sahakari account ${accountForm.name}?`}
        confirmText={editingAccountId ? 'Update Sahakari' : 'Register Sahakari'}
        confirmClass="btn-primary"
        onClose={() => setShowConfirmSubmit(false)}
        onConfirm={handleActualAccountSubmit}
      />
    </div>
  );
}
