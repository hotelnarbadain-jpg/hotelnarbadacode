import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faFileInvoice, faPen, faPlus, faTrash, faUsers, faDownload, faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { TableSkeleton } from '../components/common/Skeleton';

import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

const defaultSupplier = { partyName: '', contactNo: '', panVatNo: '', address: '', email: '' };
const defaultItem = { name: '', category: '', unit: 'pcs', showInCheckout: true, sellingPrice: 0 };
const defaultPurchase = {
  supplierId: '',
  invoiceNo: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'CASH',
  paidAmount: 0,
  remarks: '',
  items: [{ itemId: '', description: '', qty: 1, rate: 0, amount: 0 }],
};

const calculateTotal = (items) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

export default function InventoryPage({ api, updateTrigger }) {
  const [tab, setTab] = useState('summary');
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [activeBill, setActiveBill] = useState(null);
  const [search, setSearch] = useState('');
  const [supplierModal, setSupplierModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [supplierForm, setSupplierForm] = useState(defaultSupplier);
  const [itemForm, setItemForm] = useState(defaultItem);
  const [purchaseForm, setPurchaseForm] = useState(defaultPurchase);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const [supplierRows, purchaseRows, itemRows] = await Promise.all([
        api.fetchList('/suppliers'),
        api.fetchList('/purchases'),
        api.fetchList('/inventory-items').catch(() => []),
      ]);
      setSuppliers(supplierRows);
      setPurchases(purchaseRows);
      setInventoryItems(itemRows);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [updateTrigger]);

  const totalProcurement = useMemo(() => purchases.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0), [purchases]);

  const filteredSuppliers = useMemo(() => {
    const query = search.toLowerCase();
    return suppliers.filter((supplier) => [supplier.partyName, supplier.contactNo, supplier.address].some((value) => (value || '').toLowerCase().includes(query)));
  }, [search, suppliers]);

  const filteredPurchases = useMemo(() => {
    const query = search.toLowerCase();
    return purchases.filter((purchase) => [purchase.invoiceNo, purchase.paymentMethod].some((value) => (value || '').toLowerCase().includes(query)) || (purchase.supplierId?.partyName || '').toLowerCase().includes(query));
  }, [purchases, search]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();
    return inventoryItems.filter((item) => [item.name, item.category].some((value) => (value || '').toLowerCase().includes(query)));
  }, [inventoryItems, search]);

  const updateItemLine = (index, key, value) => {
    const items = purchaseForm.items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      let next = { ...item, [key]: value };
      
      // If description changes, try to find matching inventory item
      if (key === 'description') {
        const matchedItem = inventoryItems.find(i => i.name.toLowerCase() === value.toLowerCase());
        if (matchedItem) {
          next.itemId = matchedItem._id;
        } else {
          next.itemId = '';
        }
      }

      next.amount = Number(next.qty || 0) * Number(next.rate || 0);
      return next;
    });
    setPurchaseForm((current) => ({ ...current, items }));
  };

  const openSupplierCreate = () => {
    setEditingSupplier(null);
    setSupplierForm(defaultSupplier);
    setSupplierModal(true);
  };

  const openSupplierEdit = (row) => {
    setEditingSupplier(row);
    setSupplierForm({ ...defaultSupplier, ...row });
    setSupplierModal(true);
  };

  const openItemCreate = () => {
    setEditingItem(null);
    setItemForm(defaultItem);
    setItemModal(true);
  };

  const openItemEdit = (row) => {
    setEditingItem(row);
    setItemForm({ ...defaultItem, ...row });
    setItemModal(true);
  };

  const openPurchaseCreate = () => {
    setEditingPurchase(null);
    setPurchaseForm(defaultPurchase);
    setPurchaseModal(true);
  };

  const openPurchaseEdit = (row) => {
    setEditingPurchase(row);
    setPurchaseForm({
      supplierId: row.supplierId?._id || row.supplierId,
      invoiceNo: row.invoiceNo,
      date: row.date?.slice(0, 10),
      paymentMethod: row.paymentMethod || 'CASH',
      paidAmount: row.paidAmount || 0,
      remarks: row.remarks || '',
      items: row.items?.length ? row.items.map(it => ({ ...it, itemId: it.itemId?._id || it.itemId })) : defaultPurchase.items,
    });
    setPurchaseModal(true);
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    if (supplierForm.contactNo && supplierForm.contactNo.length !== 10) return notifyError('Contact number must be 10 digits');
    setSubmitting(true);
    if (editingSupplier) {
      await api.updateItem('/suppliers', editingSupplier._id, supplierForm);
      notifySuccess('Supplier updated successfully');
    } else {
      await api.createItem('/suppliers', supplierForm);
      notifySuccess('Supplier added successfully');
    }
    setSubmitting(false);
    setSupplierModal(false);
    load();
  };

  const saveItem = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateItem('/inventory-items', editingItem._id, itemForm);
        notifySuccess('Item updated successfully');
      } else {
        await api.createItem('/inventory-items', itemForm);
        notifySuccess('Item added successfully');
      }
      setItemModal(false);
      load();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const savePurchase = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const payload = {
      ...purchaseForm,
      totalAmount: calculateTotal(purchaseForm.items),
      items: purchaseForm.items.map((item) => {
        const cleanedItem = { 
          ...item, 
          qty: Number(item.qty || 0), 
          rate: Number(item.rate || 0), 
          amount: Number(item.amount || 0) 
        };
        if (!cleanedItem.itemId || cleanedItem.itemId === '') {
          delete cleanedItem.itemId;
        }
        return cleanedItem;
      }),
    };
    if (editingPurchase) {
      await api.updateItem('/purchases', editingPurchase._id, payload);
      notifySuccess('Bill updated successfully');
    } else {
      await api.createItem('/purchases', payload);
      notifySuccess('Bill submitted successfully');
    }
    setSubmitting(false);
    setPurchaseModal(false);
    load();
  };

  const deleteRecord = async () => {
    const { type, row } = confirmDelete;
    let endpoint = '';
    if (type === 'supplier') endpoint = '/suppliers';
    else if (type === 'purchase') endpoint = '/purchases';
    else if (type === 'item') endpoint = '/inventory-items';

    await api.deleteItem(endpoint, row._id);
    notifySuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Inventory Portal"
        actions={
          <div className="flex flex-wrap gap-2">
            <button className={`tab-btn ${tab === 'summary' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-text'}`} onClick={() => { setTab('summary'); setSearch(''); }}><FontAwesomeIcon icon={faChartLine} /> Summary</button>
            <button className={`tab-btn ${tab === 'items' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-text'}`} onClick={() => { setTab('items'); setSearch(''); }}><FontAwesomeIcon icon={faBoxesStacked} /> Items</button>
            <button className={`tab-btn ${tab === 'suppliers' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-text'}`} onClick={() => { setTab('suppliers'); setSearch(''); }}><FontAwesomeIcon icon={faUsers} /> Suppliers</button>
            <button className={`tab-btn ${tab === 'purchases' ? 'bg-brand-blue text-white' : 'bg-white border border-brand-border text-brand-text'}`} onClick={() => { setTab('purchases'); setSearch(''); }}><FontAwesomeIcon icon={faFileInvoice} /> Purchases</button>
          </div>
        }
      />

      {loading ? (
        <TableSkeleton columns={6} />
      ) : tab === 'summary' ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="card border-l-4 border-l-blue-500 p-6"><p className="text-[12px] uppercase text-brand-muted">Total Procurement</p><h3 className="mt-2 text-[32px] font-extrabold">Rs. {totalProcurement}</h3></div>
            <div className="card border-l-4 border-l-green-500 p-6"><p className="text-[12px] uppercase text-brand-muted">Total Invoices</p><h3 className="mt-2 text-[32px] font-extrabold">{purchases.length}</h3></div>
            <div className="card border-l-4 border-l-amber-500 p-6"><p className="text-[12px] uppercase text-brand-muted">Active Suppliers</p><h3 className="mt-2 text-[32px] font-extrabold">{suppliers.length}</h3></div>
            <div className="card border-l-4 border-l-indigo-500 p-6"><p className="text-[12px] uppercase text-brand-muted">Inventory Items</p><h3 className="mt-2 text-[32px] font-extrabold">{inventoryItems.length}</h3></div>
          </div>
          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-brand-border px-6 py-4 text-[16px] font-bold">RECENT PURCHASE RECORDS</div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm text-brand-muted">
                  <tr>
                    <th className="p-4 font-semibold">DATE</th>
                    <th className="font-semibold">SUPPLIER</th>
                    <th className="font-semibold">INVOICE NO</th>
                    <th className="font-semibold">AMOUNT</th>
                    <th className="p-4 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((item) => (
                    <tr key={item._id} className="border-t border-brand-border cursor-pointer hover:bg-slate-50 transition" onClick={() => setActiveBill(item)}>
                      <td className="p-4">{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.supplierId?.partyName || '-'}</td>
                      <td>{item.invoiceNo}</td>
                      <td className="font-semibold text-brand-blue">Rs. {item.totalAmount}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button className="btn-secondary !h-9 !px-3" onClick={(e) => { e.stopPropagation(); openPurchaseEdit(item); }}><FontAwesomeIcon icon={faPen} /></button>
                          <button className="btn-danger !h-9" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'purchase', row: item }); }}><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : tab === 'items' ? (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input className="input max-w-3xl" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-primary" onClick={openItemCreate}><FontAwesomeIcon icon={faPlus} /> Add Item</button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <div key={item._id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold uppercase leading-tight">{item.name}</h3>
                    <p className="text-[12px] uppercase text-brand-muted">{item.category || 'Uncategorized'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary !h-9 !px-3" onClick={() => openItemEdit(item)}><FontAwesomeIcon icon={faPen} /></button>
                    <button className="btn-danger !h-9" onClick={() => setConfirmDelete({ type: 'item', row: item })}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-brand-border pt-4 text-[13px]">
                  <span className="text-brand-muted">UNIT: {item.unit}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-brand-muted uppercase">CURRENT STOCK</span>
                    <span className={`text-[18px] font-black ${item.stock <= 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : tab === 'suppliers' ? (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input className="input max-w-3xl" placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-primary" onClick={openSupplierCreate}><FontAwesomeIcon icon={faPlus} /> Add Supplier</button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier._id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold uppercase leading-tight">{supplier.partyName}</h3>
                    <p className="text-[12px] uppercase text-brand-muted">Supplier</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary !h-9 !px-3" onClick={() => openSupplierEdit(supplier)}><FontAwesomeIcon icon={faPen} /></button>
                    <button className="btn-danger !h-9" onClick={() => setConfirmDelete({ type: 'supplier', row: supplier })}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </div>
                <div className="mt-5 space-y-1 text-[13px] text-brand-muted">
                  <p>PH: {supplier.contactNo}</p>
                  <p>ADDR: {supplier.address}</p>
                  <p>PAN/VAT: {supplier.panVatNo || '-'}</p>
                </div>
                <div className="mt-4 border-t border-brand-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-brand-muted uppercase">Total Credit</span>
                    <span className={`text-[15px] font-black ${
                      purchases
                        .filter(p => (p.supplierId?._id || p.supplierId) === supplier._id)
                        .reduce((sum, p) => sum + (Number(p.totalAmount || 0) - Number(p.paidAmount || 0)), 0) > 0 
                      ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      Rs. {purchases
                        .filter(p => (p.supplierId?._id || p.supplierId) === supplier._id)
                        .reduce((sum, p) => sum + (Number(p.totalAmount || 0) - Number(p.paidAmount || 0)), 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : tab === 'purchases' ? (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input className="input max-w-3xl" placeholder="Search purchases..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-primary" onClick={openPurchaseCreate}><FontAwesomeIcon icon={faPlus} /> Post Bill</button>
          </div>
          <div className="max-h-[65vh] overflow-auto pr-2 mb-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPurchases.map((purchase) => (
                <div key={purchase._id} className="card p-5 cursor-pointer hover:border-brand-blue hover:shadow-md transition-all" onClick={() => setActiveBill(purchase)}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-bold">#{purchase.invoiceNo}</h3>
                    <span className="rounded bg-slate-100 px-3 py-1 text-[12px] font-semibold text-brand-muted">{purchase.paymentMethod}</span>
                  </div>
                  <div className="mt-4 border-t border-brand-border pt-4 text-[13px] text-brand-muted">
                    <p>Supplier: {purchase.supplierId?.partyName || '-'}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span>AMOUNT</span>
                      <strong className="text-brand-blue">Rs. {purchase.totalAmount}</strong>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary !h-9 !px-3" onClick={(e) => { e.stopPropagation(); openPurchaseEdit(purchase); }}><FontAwesomeIcon icon={faPen} /></button>
                    <button className="btn-danger !h-9" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'purchase', row: purchase }); }}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <Modal open={supplierModal} title={editingSupplier ? 'Update Supplier' : 'New Supplier'} onClose={() => !submitting && setSupplierModal(false)} width="520px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingSupplier ? 'Updating supplier...' : 'Adding supplier...'}
              </p>
            </div>
          )}
          <form className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={saveSupplier}>
            <div className="md:col-span-2"><label className="label">Party Name *</label><input className="input" value={supplierForm.partyName} onChange={(e) => setSupplierForm({ ...supplierForm, partyName: e.target.value })} required /></div>
            <div>
              <label className="label">Contact No *</label>
              <input className="input" value={supplierForm.contactNo} onChange={(e) => setSupplierForm({ ...supplierForm, contactNo: e.target.value })} required />
              {supplierForm.contactNo && supplierForm.contactNo.length !== 10 && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
              )}
            </div>
            <div><label className="label">PAN / VAT No</label><input className="input" value={supplierForm.panVatNo} onChange={(e) => setSupplierForm({ ...supplierForm, panVatNo: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="label">Address *</label><input className="input" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} required /></div>
            <div className="md:col-span-2"><label className="label">Email</label><input className="input" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            <div className="md:col-span-2 mt-3 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSupplierModal(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingSupplier ? 'Update Party' : 'Save Party'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={itemModal} title={editingItem ? 'Update Item' : 'New Inventory Item'} onClose={() => !submitting && setItemModal(false)} width="520px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingItem ? 'Updating item...' : 'Adding item...'}
              </p>
            </div>
          )}
          <form className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={saveItem}>
            <div className="md:col-span-2"><label className="label">Item Name *</label><input className="input" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required /></div>
            <div><label className="label">Category</label><input className="input" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} placeholder="e.g. Toiletries, Food" /></div>
            <div><label className="label">Unit</label><input className="input" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="pcs, kg, ltr" /></div>
            <div><label className="label">Selling Price (Rs.)</label><input type="number" className="input" value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: e.target.value })} placeholder="0.00" /></div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!itemForm.showInCheckout}
                    onChange={(e) => setItemForm({ ...itemForm, showInCheckout: e.target.checked })}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${itemForm.showInCheckout ? 'bg-brand-blue' : 'bg-slate-300'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${itemForm.showInCheckout ? 'translate-x-5' : ''}`}></div>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-brand-text">Show in Checkout Bill</p>
                  <p className="text-[11px] text-brand-muted">
                    {itemForm.showInCheckout ? 'This item will appear in the Restaurant / Orders picker during checkout.' : 'This item will NOT appear during checkout billing.'}
                  </p>
                </div>
              </label>
            </div>
            <div className="md:col-span-2 mt-3 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setItemModal(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={purchaseModal} title={editingPurchase ? 'Update Purchase Bill' : 'Purchase Bill Details'} onClose={() => !submitting && setPurchaseModal(false)} width="900px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingPurchase ? 'Updating bill...' : 'Submitting bill...'}
              </p>
            </div>
          )}
          <form className={`grid gap-4 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={savePurchase}>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Supplier *</label>
                <select className="input" value={purchaseForm.supplierId} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })} required>
                  <option value="">Select...</option>
                  {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.partyName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Invoice No *</label>
                <input className="input" value={purchaseForm.invoiceNo} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNo: e.target.value })} required />
              </div>
              <div>
                <label className="label">Date *</label>
                <input className="input" type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} required />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><label className="label !mb-0">Items</label><button type="button" className="text-[12px] font-semibold text-brand-blue" onClick={() => setPurchaseForm((current) => ({ ...current, items: [...current.items, { itemId: '', description: '', qty: 1, rate: 0, amount: 0 }] }))}>+ ADD ENTRY</button></div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                {purchaseForm.items.map((item, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr,72px,96px,100px,40px]">
                    <div className="relative">
                      <input 
                        className="input" 
                        placeholder="Description (Select or type...)" 
                        value={item.description} 
                        onChange={(e) => updateItemLine(index, 'description', e.target.value)} 
                        list={`item-list-${index}`}
                        required 
                      />
                      <datalist id={`item-list-${index}`}>
                        {inventoryItems.map(i => <option key={i._id} value={i.name} />)}
                      </datalist>
                    </div>
                    <input className="input" type="number" step="any" min="0" value={item.qty} onChange={(e) => updateItemLine(index, 'qty', e.target.value)} />
                    <input className="input" type="number" step="any" min="0" value={item.rate} onChange={(e) => updateItemLine(index, 'rate', e.target.value)} />
                    <input className="input bg-slate-50" value={`Rs. ${item.amount}`} readOnly />
                    <button type="button" className="btn-secondary !h-12 !px-0" onClick={() => setPurchaseForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) || defaultPurchase.items }))}>×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 border-t border-brand-border pt-4 md:grid-cols-[120px,1fr,140px] md:items-start">
              <div>
                <label className="label">Payment</label>
                <select className="input" value={purchaseForm.paymentMethod} onChange={(e) => setPurchaseForm({ ...purchaseForm, paymentMethod: e.target.value })}>
                  <option>CASH</option>
                  <option>CARD</option>
                  <option>BANK</option>
                  <option>CREDIT</option>
                </select>
              </div>
              <div className="grid grid-cols-[1fr,150px] gap-2">
                <div>
                  <label className="label">Paid Amount</label>
                  <input 
                    type="number" 
                    step="any"
                    className="input" 
                    value={purchaseForm.paidAmount} 
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: Number(e.target.value) })} 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="label text-white select-none">Balance</label>
                  <div className="input bg-slate-50 flex items-center justify-center font-bold text-rose-600 text-[12px]">
                    {calculateTotal(purchaseForm.items) - (purchaseForm.paidAmount || 0)} rs credit
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Remarks</label>
                <input className="input" value={purchaseForm.remarks} onChange={(e) => setPurchaseForm({ ...purchaseForm, remarks: e.target.value })} placeholder="Remarks..." />
              </div>
              <div className="text-right">
                <label className="label">Total Amount</label>
                <div className="text-[28px] font-extrabold">Rs. {calculateTotal(purchaseForm.items)}</div>
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setPurchaseModal(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingPurchase ? 'Update Bill' : 'Submit Bill'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =========================================
          MODAL: INVOICE SUMMARY (READ-ONLY)
          ========================================= */}
      <Modal open={!!activeBill} title={<span className="text-brand-text font-black tracking-tight text-[18px]">Tax Invoice</span>} onClose={() => setActiveBill(null)} width="650px">
        {activeBill && (
          <div className="bg-white text-[13px] text-slate-800 p-2">
            
            {/* Header / Supplier Info */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
              <div>
                <div>
                  <p className="font-extrabold uppercase tracking-widest text-[11px] text-slate-400 mb-2">Billed From (Supplier)</p>
                  <h3 className="font-bold text-[15px]">{activeBill.supplierId?.partyName || 'Unknown Supplier'}</h3>
                  <p className="text-slate-500 mt-1">Ph: {activeBill.supplierId?.contactNo || 'N/A'}</p>
                  <p className="text-slate-500">Address: {activeBill.supplierId?.address || 'N/A'}</p>
                  {activeBill.supplierId?.panVatNo && <p className="text-slate-500">PAN/VAT: <span className="font-bold">{activeBill.supplierId.panVatNo}</span></p>}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 w-[200px] text-left">
                  <div className="mb-3">
                    <p className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400 mb-1">Invoice No</p>
                    <p className="font-black text-[15px] text-brand-text">#{activeBill.invoiceNo}</p>
                  </div>
                  <div className="mb-3">
                    <p className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400 mb-1">Date</p>
                    <p className="font-bold text-[13px]">{new Date(activeBill.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400 mb-1">Payment Method</p>
                    <p className="font-bold text-[13px] text-brand-blue">{activeBill.paymentMethod}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Info */}
            {(activeBill.paymentMethod === 'CREDIT' || activeBill.totalAmount > activeBill.paidAmount) && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="font-extrabold uppercase tracking-widest text-[10px] text-emerald-600 mb-1">Paid Amount</p>
                  <p className="font-black text-[18px] text-emerald-700">Rs. {Number(activeBill.paidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                  <p className="font-extrabold uppercase tracking-widest text-[10px] text-rose-600 mb-1">Remaining Balance</p>
                  <p className="font-black text-[18px] text-rose-700">Rs. {Number(activeBill.totalAmount - (activeBill.paidAmount || 0)).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
              <div className="max-h-[250px] overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-100 text-[11px] font-extrabold uppercase tracking-widest text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Rate (Rs)</th>
                      <th className="px-4 py-3 text-right bg-slate-50">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBill.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-slate-500 text-[12px]">{Number(item.rate).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700 bg-slate-50/50">{Number(item.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Remarks */}
            <div className="flex justify-between items-end">
              <div className="max-w-[300px]">
                {activeBill.remarks && (
                  <>
                    <p className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400 mb-1">Remarks</p>
                    <p className="text-slate-600 italic border-l-2 border-slate-200 pl-3 py-1">{activeBill.remarks}</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="font-extrabold uppercase tracking-widest text-[11px] text-slate-400 mb-1">Total Amount</p>
                <p className="text-[28px] font-black tracking-tight text-brand-blue">Rs. {Number(activeBill.totalAmount || 0).toLocaleString()}</p>
              </div>
            </div>

          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Delete this ${confirmDelete?.type}?`} onClose={() => setConfirmDelete(null)} onConfirm={deleteRecord} />
    </div>
  );
}
