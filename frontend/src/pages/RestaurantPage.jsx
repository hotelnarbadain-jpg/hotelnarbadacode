import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faPen, faPlus, faTrash, faPrint, faEye, faUser, faBed, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';
import { BillPrintContent } from './BillsManagementPage';
import client from '../api/client';

const itemDefaults = { name: '', category: '', sellingPrice: '', stock: '', showInCheckout: true };
const categoryDefaults = { name: '', description: '' };
const tableDefaults = { number: '', capacity: 2, status: 'Available' };
const orderDefaults = { orderType: 'Table', tableId: '', tableName: '', guestId: '', guestName: '', items: [], totalAmount: 0, status: 'Pending', paymentMethod: 'Cash' };

export default function RestaurantPage({ api, updateTrigger }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('MENU');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('ITEM');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(itemDefaults);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guests, setGuests] = useState([]);
  const [profile, setProfile] = useState({});
  const [viewBill, setViewBill] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [kotSelection, setKotSelection] = useState(null);
  const [kotPrint, setKotPrint] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, catsRes, tablesRes, ordersRes, guestsRes, profileRes] = await Promise.all([
        api.fetchList('/inventory-items'),
        api.fetchList('/restaurant-categories').catch(() => []),
        api.fetchList('/restaurant-tables').catch(() => []),
        api.fetchList('/restaurant-orders').catch(() => []),
        api.fetchList('/guests').catch(() => []),
        client.get('/profile').then(res => res.data).catch(() => ({})),
      ]);

      const invItems = invRes.filter(item => item.showInCheckout);
      setItems(invItems);
      setTables(tablesRes);
      setOrders(ordersRes);
      setGuests(guestsRes);
      setProfile(profileRes);

      // Sync categories...
      const invCategories = [...new Set(invItems.map(i => i.category).filter(Boolean))];
      const existingCatNames = catsRes.map(c => c.name);

      let updatedCats = [...catsRes];
      for (const name of invCategories) {
        if (!existingCatNames.includes(name)) {
          try {
            const newCat = await api.createItem('/restaurant-categories', { name, description: 'Auto-created from Inventory' });
            updatedCats.push(newCat);
          } catch (e) { console.error('Failed to auto-create category', name); }
        }
      }
      setCategories(updatedCats);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePrintKOT = (order) => {
    setKotSelection({ order, selectedItems: order.items.map((_, idx) => idx) });
  };

  const finalizeKOTPrint = () => {
    if (kotSelection.selectedItems.length === 0) return notifyError('Please select at least one item');
    const itemsToPrint = kotSelection.order.items.filter((_, idx) => kotSelection.selectedItems.includes(idx));
    setKotPrint({ ...kotSelection.order, items: itemsToPrint });
    setKotSelection(null);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  useEffect(() => { load(); }, [updateTrigger]);

  const categoryNames = useMemo(() => {
    const fromItems = items.map(i => i.category).filter(Boolean);
    const fromCats = categories.map(c => c.name).filter(Boolean);
    return ['All Categories', ...new Set([...fromItems, ...fromCats])];
  }, [items, categories]);
  const visibleItems = categoryFilter === 'All Categories' ? items : items.filter((item) => item.category === categoryFilter);

  const openModal = (type, data = null) => {
    setModalType(type);
    setEditing(data);
    if (type === 'ITEM') setForm(data ? { ...data } : itemDefaults);
    else if (type === 'CATEGORY') setForm(data ? { ...data } : categoryDefaults);
    else if (type === 'TABLE') setForm(data ? { ...data } : tableDefaults);
    else if (type === 'ORDER') setForm(data ? { ...data } : orderDefaults);
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      let endpoint = '';
      if (modalType === 'ITEM') endpoint = '/inventory-items';
      else if (modalType === 'CATEGORY') endpoint = '/restaurant-categories';
      else if (modalType === 'TABLE') endpoint = '/restaurant-tables';
      else if (modalType === 'ORDER') endpoint = '/restaurant-orders';

      const payload = { ...form };
      if (modalType === 'ITEM') {
        payload.sellingPrice = Number(form.sellingPrice || 0);
        payload.stock = Number(form.stock || 0);
        payload.showInCheckout = true;
      }
      if (modalType === 'ORDER') {
        if (!payload.guestId) delete payload.guestId;
        if (!payload.tableId) delete payload.tableId;
      }

      if (editing) {
        await api.updateItem(endpoint, editing._id, payload);
        notifySuccess(`${modalType} updated successfully`);
      } else {
        await api.createItem(endpoint, payload);
        notifySuccess(`${modalType} added successfully`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      notifyError('Failed to save data');
    }
    setSubmitting(false);
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      let endpoint = '';
      if (modalType === 'ITEM') endpoint = '/inventory-items';
      else if (modalType === 'CATEGORY') endpoint = '/restaurant-categories';
      else if (modalType === 'TABLE') endpoint = '/restaurant-tables';
      else if (modalType === 'ORDER') endpoint = '/restaurant-orders';

      await api.deleteItem(endpoint, confirmDelete._id);
      notifySuccess(`${modalType} deleted successfully`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      notifyError('Failed to delete item');
      setConfirmDelete(null);
    }
  };

  const handleCompleteOrder = (order) => {
    const billData = {
      billNo: `ORD-${order._id.slice(-6).toUpperCase()}`,
      date: new Date(),
      guestName: order.guestName || (order.guestId ? guests.find(g => g._id === order.guestId)?.name : 'Normal Person'),
      roomNo: order.guestId ? guests.find(g => g._id === order.guestId)?.roomNumber : 'N/A',
      restaurantItems: order.items.map(i => ({
        item: i.name,
        qty: i.quantity,
        price: i.price,
        total: i.subtotal
      })),
      subTotal: order.totalAmount,
      discount: 0,
      grandTotal: order.totalAmount,
      paymentMethod: order.paymentMethod,
      _originalOrder: order // Keep reference for completion
    };
    setViewBill(billData);
  };



  const finalizeCompletion = async () => {
    try {
      setSubmitting(true);
      const order = viewBill._originalOrder;
      await api.updateItem('/restaurant-orders', order._id, { status: 'Completed' });
      notifySuccess('Order completed successfully');
      setViewBill(null);
      load();
    } catch (err) {
      notifyError('Failed to complete order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Restaurant Management"
        subtitle="Manage Menu, Categories, Tables, Orders and Transactions"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Orders', orders.length],
          ['Pending Orders', orders.filter(o => o.status !== 'Completed').length],
          [`Today's Revenue`, `Rs. ${orders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + o.totalAmount, 0)}`],
          ['Active Tables', tables.filter(t => t.status === 'Occupied').length]
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-[12px] uppercase text-brand-muted">{label}</p>
            <h3 className="mt-2 text-[24px] font-bold">{value}</h3>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-8 border-b border-brand-border text-[13px] font-semibold">
        {['MENU', 'CATEGORIES', 'TABLES', 'ORDERS', 'TRANSACTIONS'].map((name) => (
          <button
            key={name}
            className={`border-b-2 pb-3 ${tab === name ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-muted'}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="mt-6">
          {tab === 'MENU' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  {categoryNames.map((name) => (
                    <button
                      key={name}
                      className={`rounded-full px-4 py-2 text-[12px] font-semibold ${categoryFilter === name ? 'bg-brand-blue text-white' : 'bg-slate-100 text-brand-text'}`}
                      onClick={() => setCategoryFilter(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <button className="btn-primary" onClick={() => openModal('ITEM')}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
                </button>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {visibleItems.map((item) => (
                  <div key={item._id} className="card p-5">
                    <div className="flex justify-between gap-2">
                      <div className="grid h-16 w-16 place-content-center rounded-2xl bg-slate-100 text-brand-muted text-[24px]">🍽️</div>
                      <div className="flex gap-2">
                        <button className="btn-secondary !h-9 !px-3" onClick={() => openModal('ITEM', item)}>
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button className="btn-danger !h-9" onClick={() => { setModalType('ITEM'); setConfirmDelete(item); }}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-4 text-[16px] font-bold">{item.name}</h3>
                    <p className="mt-2 font-bold text-brand-blue">Rs. {item.sellingPrice}</p>
                    <p className="text-[12px] text-brand-muted">Stock: {item.stock} {item.unit}</p>
                    <p className={`mt-2 text-[12px] text-green-600`}>
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-1" /> Available
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'CATEGORIES' && (
            <>
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => openModal('CATEGORY')}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Category
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {categoryNames.filter(n => n !== 'All Categories').map((name) => {
                  const cat = categories.find(c => c.name === name);
                  return (
                    <div key={name} className="card p-5 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{name}</h3>
                        <p className="text-[12px] text-brand-muted">{cat?.description || 'Inventory Category'}</p>
                      </div>
                      <div className="flex gap-2">
                        {cat && (
                          <>
                            <button className="btn-secondary !h-9 !px-3" onClick={() => openModal('CATEGORY', cat)}><FontAwesomeIcon icon={faPen} /></button>
                            <button className="btn-danger !h-9" onClick={() => { setModalType('CATEGORY'); setConfirmDelete(cat); }}><FontAwesomeIcon icon={faTrash} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'TABLES' && (
            <>
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => openModal('TABLE')}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Table
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {tables.map((table) => (
                  <div key={table._id} className="card p-5">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-[16px]">Table {table.number}</h3>
                      <div className="flex gap-2">
                        <button className="text-brand-muted hover:text-brand-blue" onClick={() => openModal('TABLE', table)}><FontAwesomeIcon icon={faPen} /></button>
                        <button className="text-brand-muted hover:text-red-600" onClick={() => { setModalType('TABLE'); setConfirmDelete(table); }}><FontAwesomeIcon icon={faTrash} /></button>
                      </div>
                    </div>
                    <p className="text-[12px] text-brand-muted mt-2">Capacity: {table.capacity}</p>
                    <p className={`text-[12px] mt-2 font-semibold ${table.status === 'Available' ? 'text-green-600' : 'text-red-600'}`}>{table.status}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'ORDERS' && (
            <>
              <div className="flex justify-end mb-4">
                <button className="btn-primary" onClick={() => openModal('ORDER')}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> New Order
                </button>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50 font-semibold text-brand-muted">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Table</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {orders.filter(o => o.status !== 'Completed').map((order) => (
                      <tr key={order._id}>
                        <td className="px-6 py-4 font-semibold text-brand-blue">#{order._id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4">Table {order.tableName}</td>
                        <td className="px-6 py-4">
                          {order.orderType === 'Room' ? (
                            <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faBed} className="text-brand-blue" /> {order.guestName || 'Room Guest'}</span>
                          ) : (
                            <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faUser} className="text-brand-muted" /> {order.guestName || 'Normal'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold">Rs. {order.totalAmount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[11px] ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button className="btn-success !h-8 !px-3 text-[11px]" onClick={() => handleCompleteOrder(order)}>Complete/Bill</button>
                            <button className="btn-secondary !h-8 !px-3" onClick={() => handlePrintKOT(order)} title="Print KOT"><FontAwesomeIcon icon={faClipboardList} /></button>
                            <button className="btn-secondary !h-8 !px-3" onClick={() => openModal('ORDER', order)} title="Edit Order"><FontAwesomeIcon icon={faPen} /></button>
                            <button className="btn-danger !h-8" onClick={() => { setModalType('ORDER'); setConfirmDelete(order); }} title="Delete Order"><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {orders.filter(o => o.status !== 'Completed').length === 0 && (
                      <tr><td colSpan="6" className="text-center py-10 text-brand-muted">No active orders.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'TRANSACTIONS' && (
            <div className="card overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 font-semibold text-brand-muted">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Table</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {orders.filter(o => o.status === 'Completed').map((order) => (
                    <tr key={order._id}>
                      <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">Table {order.tableName}</td>
                      <td className="px-6 py-4">{order.guestName || 'Normal'}</td>
                      <td className="px-6 py-4 font-bold text-brand-blue">Rs. {order.totalAmount}</td>
                      <td className="px-6 py-4">{order.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="btn-secondary !h-8 !px-3" onClick={() => handleCompleteOrder(order)} title="View Bill"><FontAwesomeIcon icon={faEye} /></button>
                          <button className="btn-secondary !h-8 !px-3" onClick={() => openModal('ORDER', order)} title="Edit Order"><FontAwesomeIcon icon={faPen} /></button>
                          <button className="btn-danger !h-8" onClick={() => { setModalType('ORDER'); setConfirmDelete(order); }} title="Delete Transaction"><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => o.status === 'Completed').length === 0 && (
                    <tr><td colSpan="6" className="text-center py-10 text-brand-muted">No transactions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} title={`${editing ? 'Update' : 'Add'} ${modalType.charAt(0) + modalType.slice(1).toLowerCase()}`} onClose={() => !submitting && setModalOpen(false)} width={modalType === 'ORDER' ? '700px' : '480px'}>
        <form className="grid gap-4" onSubmit={submit}>
          {modalType === 'ITEM' && (
            <>
              <div><label className="label text-[13px]">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-[13px]">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select Category</option>
                    {categoryNames.filter(n => n !== 'All Categories').map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div><label className="label text-[13px]">Selling Price (Rs.)</label><input className="input" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-[13px]">Stock</label><input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                <div><label className="label text-[13px]">Unit</label><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, kg, etc." /></div>
              </div>
            </>
          )}

          {modalType === 'CATEGORY' && (
            <>
              <div><label className="label text-[13px]">Category Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label text-[13px]">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </>
          )}

          {modalType === 'TABLE' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label text-[13px]">Table Number</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></div>
                <div><label className="label text-[13px]">Capacity</label><input className="input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
              </div>
              <div>
                <label className="label text-[13px]">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>
            </>
          )}

          {modalType === 'ORDER' && (
            <div className="grid gap-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-2 border border-brand-border">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, orderType: 'Table', paymentMethod: 'Cash', guestId: '', guestName: '' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition ${form.orderType === 'Table' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  <FontAwesomeIcon icon={faUser} /> Normal Person
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, orderType: 'Room', paymentMethod: 'Room Charge' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition ${form.orderType === 'Room' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                >
                  <FontAwesomeIcon icon={faBed} /> Room Guest
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-[13px]">
                    Select Table {form.orderType === 'Room' && <span className="text-slate-400 font-normal italic">(Optional)</span>}
                  </label>
                  <select className="input" value={form.tableId} onChange={(e) => {
                    const t = tables.find(x => x._id === e.target.value);
                    setForm({ ...form, tableId: e.target.value, tableName: t?.number || '' });
                  }} required={form.orderType !== 'Room'}>
                    <option value="">{form.orderType === 'Room' ? 'No Table (Room Service)' : 'Choose Table'}</option>
                    {tables.filter(t => t.status === 'Available' || t._id === form.tableId).map(t => (
                      <option key={t._id} value={t._id}>Table {t.number} {t.status === 'Occupied' ? '(Occupied)' : ''}</option>
                    ))}
                  </select>
                </div>
                {form.orderType === 'Table' ? (
                  <div><label className="label text-[13px]">Customer Name (Optional)</label><input className="input" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Guest Name" /></div>
                ) : (
                  <div>
                    <label className="label text-[13px]">Select Room / Guest</label>
                    <select className="input" value={form.guestId} onChange={(e) => {
                      const g = guests.find(x => x._id === e.target.value);
                      setForm({ ...form, guestId: e.target.value, guestName: g?.name || '' });
                    }} required>
                      <option value="">Choose Guest</option>
                      {guests.filter(g => g.status === 'Checked In' || g._id === form.guestId).map(g => <option key={g._id} value={g._id}>Room {g.rooms?.map(r => r.roomNo).join(', ') || g.roomNo} - {g.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="border border-brand-border rounded-xl p-4">
                <p className="font-bold mb-2 text-[13px]">Add Items</p>
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="input !h-9 mb-2 text-[12px]" 
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto mb-4 bg-slate-50 p-2 rounded-lg">
                  {items.filter(item => item.name.toLowerCase().includes(menuSearch.toLowerCase())).map(item => (
                    <div key={item._id} className="flex justify-between items-center py-2 border-b border-brand-border last:border-0">
                      <span className="text-[12px]">{item.name} (Rs. {item.sellingPrice})</span>
                      <button type="button" className="btn-secondary !h-7 !px-2 !text-[11px]" onClick={() => {
                        const existing = form.items.find(i => i.itemId === item._id);
                        let newItems = [];
                        if (existing) {
                          newItems = form.items.map(i => i.itemId === item._id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i);
                        } else {
                          newItems = [...form.items, { itemId: item._id, name: item.name, quantity: 1, price: Number(item.sellingPrice), subtotal: Number(item.sellingPrice) }];
                        }
                        setForm({ ...form, items: newItems, totalAmount: newItems.reduce((s, i) => s + i.subtotal, 0) });
                      }}>Add</button>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {form.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span>{i.name}</span>
                        <div className="flex items-center border border-brand-border rounded bg-white overflow-hidden">
                          <button type="button" className="px-1 hover:bg-slate-100" onClick={() => {
                            const newQty = Math.max(0, i.quantity - 1);
                            if (newQty === 0) {
                              const newItems = form.items.filter((_, idx2) => idx !== idx2);
                              setForm({ ...form, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
                            } else {
                              const newItems = form.items.map((it, idx2) => idx === idx2 ? { ...it, quantity: newQty, subtotal: newQty * it.price } : it);
                              setForm({ ...form, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
                            }
                          }}>-</button>
                          <span className="px-2 font-bold">{i.quantity}</span>
                          <button type="button" className="px-1 hover:bg-slate-100" onClick={() => {
                            const newQty = i.quantity + 1;
                            const newItems = form.items.map((it, idx2) => idx === idx2 ? { ...it, quantity: newQty, subtotal: newQty * it.price } : it);
                            setForm({ ...form, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
                          }}>+</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">Rs. {i.subtotal}</span>
                        <button type="button" className="text-red-500" onClick={() => {
                          const newItems = form.items.filter((_, idx2) => idx !== idx2);
                          setForm({ ...form, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
                        }}><FontAwesomeIcon icon={faTrash} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-2 border-t border-brand-border font-bold flex justify-between text-[13px]">
                  <span>Total Amount</span>
                  <span className="text-brand-blue">Rs. {form.totalAmount}</span>
                </div>
              </div>

              <div>
                <label className="label text-[13px]">Payment Method</label>
                <select 
                  className="input" 
                  value={form.paymentMethod} 
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Online">Online</option>
                  <option value="Credit">Credit (Add to Dues)</option>
                  {form.orderType === 'Room' && <option value="Room Charge">Room Charge</option>}
                </select>
                <p className="mt-1 text-[11px] text-brand-muted italic">
                  {['Credit', 'Room Charge'].includes(form.paymentMethod) ? 'This will add the amount to the guest dues management.' : 'This will be recorded as immediate income.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3 border-t border-brand-border pt-4">
            <button type="button" className="btn-secondary !h-10" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
            <button className="btn-primary !h-10" disabled={submitting}>
              {submitting ? 'Saving...' : editing ? `Update ${modalType.charAt(0) + modalType.slice(1).toLowerCase()}` : (modalType === 'ORDER' ? 'Place Order' : `Add ${modalType.charAt(0) + modalType.slice(1).toLowerCase()}`)}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewBill} title="Bill Preview" onClose={() => setViewBill(null)} width="1000px" actions={
        viewBill?._originalOrder?.status !== 'Completed' && (
          <button className="btn-success" onClick={finalizeCompletion} disabled={submitting}>
            {submitting ? 'Completing...' : 'Finalize & Complete Order'}
          </button>
        )
      }>
        {viewBill && (
          <>
            <div className="flex justify-center mb-6 no-print">
              <button className="btn-primary" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} className="mr-2" /> Print Bill</button>
            </div>
            <BillPrintContent bill={viewBill} profile={profile} onClose={() => setViewBill(null)} />
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Delete this ${modalType?.toLowerCase() || 'item'}? ${modalType === 'ORDER' ? 'This will reverse transactions and stock if order is completed.' : ''}`} onClose={() => setConfirmDelete(null)} onConfirm={remove} />

      {/* KOT Item Selection Modal */}
      <Modal open={!!kotSelection} title="Select Items for KOT" onClose={() => setKotSelection(null)} width="400px">
        {kotSelection && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500 font-medium">Which items should be included in this Kitchen Ticket?</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {kotSelection.order.items.map((it, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-brand-border hover:bg-slate-50 cursor-pointer transition">
                  <input 
                    type="checkbox" 
                    checked={kotSelection.selectedItems.includes(idx)}
                    onChange={(e) => {
                      const newSelection = e.target.checked 
                        ? [...kotSelection.selectedItems, idx]
                        : kotSelection.selectedItems.filter(i => i !== idx);
                      setKotSelection({ ...kotSelection, selectedItems: newSelection });
                    }}
                    className="w-4 h-4 text-brand-blue rounded border-slate-300"
                  />
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">{it.name}</p>
                    <p className="text-[11px] text-brand-muted">Quantity: {it.quantity}</p>
                  </div>
                </label>
              ))}
            </div>
            <button 
              onClick={finalizeKOTPrint}
              className="btn-primary w-full !h-12"
            >
              <FontAwesomeIcon icon={faPrint} className="mr-2" /> Print Selected KOT
            </button>
          </div>
        )}
      </Modal>


      {/* Hidden KOT Print Container */}
      {kotPrint && createPortal(
        <div className="kot-print-portal font-mono text-black">
          <style>{`
            @media screen {
              .kot-print-portal { display: none !important; }
            }
            @media print {
              @page {
                size: 80mm auto;
                margin: 0 !important;
              }
              body > *:not(.bill-print-portal):not(.kot-print-portal) { display: none !important; }
              #root, .modal-backdrop, .modal-container, .no-print { display: none !important; }
              
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm !important;
                overflow: hidden !important;
              }
              
              .kot-print-portal {
                display: inline-block !important;
                width: 80mm !important; 
                margin: 0 !important;
                padding: 2mm !important;
                padding-bottom: 1cm !important; 
                background: white !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          <div className="text-center border-b border-black pb-2 mb-4">
            <h2 className="text-[18px] font-bold uppercase">Kitchen Order Ticket</h2>
            <p className="text-[14px]">{new Date().toLocaleString()}</p>
          </div>
          
          <div className="flex justify-between mb-2 text-[14px]">
            <span className="font-bold">Type: {kotPrint.orderType}</span>
            <span className="font-bold">{kotPrint.orderType === 'Table' ? `Table: ${kotPrint.tableName}` : `Guest: ${kotPrint.guestName}`}</span>
          </div>

          <table className="w-full text-left text-[14px] border-y border-black py-2 mb-4">
            <thead>
              <tr>
                <th className="pb-1">Item</th>
                <th className="text-right pb-1">Qty</th>
              </tr>
            </thead>
            <tbody>
              {kotPrint.items.map((it, i) => (
                <tr key={i}>
                  <td className="py-1 uppercase">{it.name}</td>
                  <td className="text-right py-1 font-bold">x{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-center text-[12px] italic mt-4 pt-4 border-t border-black">
            * Please prepare ASAP *
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
