import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUtensils, faPlus, faTrash, faPrint, faUser, faBed, 
  faCartPlus, faClock, faFireBurner, faCheckCircle, faCheckDouble,
  faSearch, faChevronRight, faChevronLeft, faClipboardList, faPen
} from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';
import client from '../../api/client';

const orderDefaults = { 
  orderType: 'Table', 
  tableId: '', 
  tableName: '', 
  guestId: '', 
  guestName: '', 
  items: [], 
  totalAmount: 0, 
  status: 'Pending', 
  paymentMethod: 'Cash' 
};

export default function WaiterRestaurantPage({ api, updateTrigger }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [guests, setGuests] = useState([]);
  const [tab, setTab] = useState('NEW_ORDER');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState(orderDefaults);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [kotPrint, setKotPrint] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [kotSelection, setKotSelection] = useState(null); // { order, selectedItems: [] }

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, catsRes, tablesRes, ordersRes, guestsRes] = await Promise.all([
        api.fetchList('/inventory-items'),
        api.fetchList('/restaurant-categories').catch(() => []),
        api.fetchList('/restaurant-tables').catch(() => []),
        api.fetchList('/restaurant-orders').catch(() => []),
        api.fetchList('/guests').catch(() => []),
      ]);

      setItems(invRes.filter(i => i.showInCheckout));
      setCategories(catsRes);
      setTables(tablesRes);
      setOrders(ordersRes);
      setGuests(guestsRes);
    } catch (err) {
      notifyError('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [updateTrigger]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled');
  }, [orders]);

  const addToCart = (item) => {
    const existing = cart.items.find(i => i.itemId === item._id);
    let newItems = [];
    if (existing) {
      newItems = cart.items.map(i => i.itemId === item._id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i);
    } else {
      newItems = [...cart.items, { itemId: item._id, name: item.name, quantity: 1, price: Number(item.sellingPrice), subtotal: Number(item.sellingPrice) }];
    }
    setCart({ ...cart, items: newItems, totalAmount: newItems.reduce((s, i) => s + i.subtotal, 0) });
    notifySuccess(`${item.name} added to cart`);
  };

  const updateCartQty = (idx, delta) => {
    const item = cart.items[idx];
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) {
      const newItems = cart.items.filter((_, i) => i !== idx);
      setCart({ ...cart, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
    } else {
      const newItems = cart.items.map((it, i) => i === idx ? { ...it, quantity: newQty, subtotal: newQty * it.price } : it);
      setCart({ ...cart, items: newItems, totalAmount: newItems.reduce((s, it) => s + it.subtotal, 0) });
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (cart.items.length === 0) return notifyError('Cart is empty');
    if (cart.orderType === 'Table' && !cart.tableId) return notifyError('Please select a table');
    if (cart.orderType === 'Room' && !cart.guestId) return notifyError('Please select a guest');

    setSubmitting(true);
    try {
      const payload = { ...cart };
      if (!payload.guestId) delete payload.guestId;
      if (!payload.tableId) delete payload.tableId;

      if (editingOrderId) {
        // Strip _id from items to avoid sub-document update issues
        const cleanItems = payload.items.map(({ _id, ...rest }) => rest);
        await api.updateItem('/restaurant-orders', editingOrderId, { ...payload, items: cleanItems });
        notifySuccess('Order updated successfully');
      } else {
        await api.createItem('/restaurant-orders', payload);
        notifySuccess('Order placed successfully');
      }
      setCart(orderDefaults);
      setEditingOrderId(null);
      setTab('ACTIVE_ORDERS');
      loadData();
    } catch (err) {
      console.error('CRITICAL: Order save failed:', err.response?.data || err.message);
      notifyError('Failed to save order: ' + (err.response?.data?.message || 'Server Error'));
    }
    setSubmitting(false);
  };

  const handleEditOrder = (order) => {
    setCart({
      orderType: order.orderType,
      tableId: order.tableId,
      tableName: order.tableName,
      guestId: order.guestId,
      guestName: order.guestName,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod
    });
    setEditingOrderId(order._id);
    setTab('NEW_ORDER');
    notifySuccess('Editing order #' + order._id.slice(-6).toUpperCase());
  };

  const updateStatus = async (order, newStatus) => {
    try {
      await api.updateItem('/restaurant-orders', order._id, { status: newStatus });
      notifySuccess(`Order status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      notifyError('Failed to update status');
    }
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

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': 'bg-orange-100 text-orange-700 border-orange-200',
      'Preparing': 'bg-rose-100 text-rose-700 border-rose-200',
      'Served': 'bg-blue-100 text-blue-700 border-blue-200',
      'Completed': 'bg-green-100 text-green-700 border-green-200'
    };
    return <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${styles[status] || 'bg-slate-100'}`}>{status}</span>;
  };

  if (loading && items.length === 0) return <LoadingSpinner />;

  return (
    <div className="waiter-panel">
      <PageHeader title="Waiter Panel" subtitle="Manage Restaurant Orders & Tables" />

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-brand-border">
        <button onClick={() => setTab('NEW_ORDER')} className={`pb-3 text-[14px] font-bold transition-all ${tab === 'NEW_ORDER' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-brand-muted border-b-2 border-transparent'}`}>
          <FontAwesomeIcon icon={faCartPlus} className="mr-2" /> New Order
        </button>
        <button onClick={() => setTab('ACTIVE_ORDERS')} className={`pb-3 text-[14px] font-bold transition-all ${tab === 'ACTIVE_ORDERS' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-brand-muted border-b-2 border-transparent'}`}>
          <FontAwesomeIcon icon={faClock} className="mr-2" /> Active Orders ({activeOrders.length})
        </button>
      </div>

      {tab === 'NEW_ORDER' ? (
        <div className="relative">
          {/* Menu Section - Now Full Width */}
          <div className="space-y-6">
            <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-brand-blue/10">
              <div className="relative w-full md:w-64">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input 
                  className="input !pl-10 !h-10 text-[13px]" 
                  placeholder="Search dishes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
                <button onClick={() => setCategoryFilter('All')} className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition ${categoryFilter === 'All' ? 'bg-brand-blue text-white shadow-sm' : 'bg-slate-100 text-brand-muted hover:bg-slate-200'}`}>All</button>
                {categories.map(cat => (
                  <button key={cat._id} onClick={() => setCategoryFilter(cat.name)} className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition ${categoryFilter === cat.name ? 'bg-brand-blue text-white shadow-sm' : 'bg-slate-100 text-brand-muted hover:bg-slate-200'}`}>{cat.name}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div key={item._id} className="card p-4 hover:shadow-lg transition-all group flex flex-col justify-between h-full border-brand-blue/5">
                  <div>
                    <div className="aspect-square rounded-xl bg-slate-50 flex items-center justify-center text-[32px] mb-3 group-hover:scale-105 transition-transform">
                      {item.category === 'Drinks' ? '🍹' : item.category === 'Dessert' ? '🍰' : '🍛'}
                    </div>
                    <h4 className="font-bold text-[14px] text-slate-800 leading-tight">{item.name}</h4>
                    <p className="text-brand-blue font-black mt-1">Rs. {item.sellingPrice}</p>
                  </div>
                  <button onClick={() => addToCart(item)} className="btn-primary !h-9 mt-4 w-full text-[12px]">
                    <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => {
              if (cart.items.length === 0 && !editingOrderId) return notifyError('Cart is empty');
              setCartOpen(true);
            }}
            className="fixed bottom-8 right-8 z-40 h-16 w-16 rounded-full bg-brand-blue text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-bounce-subtle"
          >
            <FontAwesomeIcon icon={faCartPlus} className="text-[24px]" />
            {(cart.items.length > 0 || editingOrderId) && (
              <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-rose-500 border-2 border-white text-[11px] font-black flex items-center justify-center">
                {editingOrderId ? 'E' : cart.items.length}
              </span>
            )}
          </button>

          {/* Cart Modal (The "Opened Cart") */}
          <Modal open={cartOpen} title={editingOrderId ? "Edit Order" : "Current Cart"} onClose={() => setCartOpen(false)} width="480px">
            <div className="space-y-6">
              {editingOrderId && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-amber-800 text-[12px] font-bold">You are editing order #{editingOrderId.slice(-6).toUpperCase()}</span>
                  <button onClick={() => { setEditingOrderId(null); setCart(orderDefaults); setCartOpen(false); }} className="text-amber-800 underline text-[12px]">Cancel Edit</button>
                </div>
              )}
              {/* Order Type Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setCart({ ...cart, orderType: 'Table', paymentMethod: 'Cash', guestId: '' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition ${cart.orderType === 'Table' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500'}`}>
                  <FontAwesomeIcon icon={faUser} /> Table
                </button>
                <button type="button" onClick={() => setCart({ ...cart, orderType: 'Room', paymentMethod: 'Room Charge' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition ${cart.orderType === 'Room' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500'}`}>
                  <FontAwesomeIcon icon={faBed} /> Room
                </button>
              </div>

              {/* Selections */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">Select {cart.orderType}</label>
                  {cart.orderType === 'Table' ? (
                    <select className="input !h-11 font-bold text-[13px]" value={cart.tableId} onChange={(e) => {
                      const t = tables.find(x => x._id === e.target.value);
                      setCart({ ...cart, tableId: e.target.value, tableName: t?.number || '' });
                    }}>
                      <option value="">-- Select Table --</option>
                      {tables.filter(t => t.status === 'Available' || t._id === cart.tableId).map(t => (
                        <option key={t._id} value={t._id}>Table {t.number} {t.status === 'Occupied' ? '(Occupied)' : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <select className="input !h-11 font-bold text-[13px]" value={cart.guestId} onChange={(e) => {
                      const g = guests.find(x => x._id === e.target.value);
                      setCart({ ...cart, guestId: e.target.value, guestName: g?.name || '' });
                    }}>
                      <option value="">-- Select Guest Room --</option>
                      {guests.filter(g => g.status === 'Checked In').map(g => <option key={g._id} value={g._id}>Room {g.roomNo} - {g.name}</option>)}
                    </select>
                  )}
                </div>
                {cart.orderType === 'Table' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">Guest Name (Optional)</label>
                    <input className="input !h-11 text-[13px]" placeholder="e.g. John Doe" value={cart.guestName} onChange={(e) => setCart({ ...cart, guestName: e.target.value })} />
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.items.length === 0 ? (
                  <div className="text-center py-10 opacity-30">
                    <FontAwesomeIcon icon={faUtensils} className="text-[40px] mb-2" />
                    <p className="text-[13px] font-bold">Cart is empty</p>
                  </div>
                ) : (
                  cart.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-slate-50 rounded-xl border border-brand-border/50">
                      <div className="flex-1">
                        <p className="font-bold text-[13px] text-slate-800">{it.name}</p>
                        <p className="text-[11px] text-brand-blue font-bold">Rs. {it.price}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-lg border border-brand-border overflow-hidden shadow-sm">
                          <button onClick={() => updateCartQty(idx, -1)} className="px-2 py-1 hover:bg-slate-100 text-brand-blue"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                          <span className="px-2 text-[13px] font-black">{it.quantity}</span>
                          <button onClick={() => updateCartQty(idx, 1)} className="px-2 py-1 hover:bg-slate-100 text-brand-blue"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
                        </div>
                        <span className="font-black text-[13px] min-w-[60px] text-right">₹{it.subtotal}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total & Submit */}
              {cart.items.length > 0 && (
                <div className="pt-4 border-t border-brand-border space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[14px] font-bold text-slate-500">Total Amount</span>
                    <span className="text-[20px] font-black text-brand-blue">Rs. {cart.totalAmount}</span>
                  </div>
                  <button onClick={(e) => { submitOrder(e); setCartOpen(false); }} disabled={submitting} className="btn-primary w-full !h-14 !text-[16px]">
                    {submitting ? 'Saving...' : (editingOrderId ? 'Update Order' : 'Confirm & Send Order')}
                  </button>
                </div>
              )}
            </div>
          </Modal>
        </div>
      ) : (
        /* Active Orders Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeOrders.map(order => (
            <div key={order._id} className="card p-0 overflow-hidden border-brand-blue/10 hover:border-brand-blue/30 transition-all shadow-md">
              <div className="p-4 border-b border-brand-border flex justify-between items-start bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-brand-blue text-[15px]">#{order._id.slice(-6).toUpperCase()}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-[12px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    {order.tableName ? `Table ${order.tableName}` : order.orderType === 'Room' ? `Room ${guests.find(g => g._id === order.guestId)?.roomNo || 'N/A'}` : 'Counter Order'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-black text-slate-800">Rs. {order.totalAmount}</p>
                  <p className="text-[10px] text-brand-muted">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[13px] items-center">
                    <span className="text-slate-700 font-medium">{it.name} <span className="text-[11px] text-brand-muted font-bold ml-1">x{it.quantity}</span></span>
                    <span className="font-bold text-slate-500">Rs. {it.subtotal}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 border-t border-brand-border grid grid-cols-2 gap-2">
                {order.status === 'Pending' && (
                  <button onClick={() => updateStatus(order, 'Preparing')} className="btn-primary !bg-rose-600 hover:!bg-rose-700 !h-10 text-[12px] col-span-2">
                    <FontAwesomeIcon icon={faFireBurner} className="mr-2" /> Send to Kitchen
                  </button>
                )}
                {order.status === 'Preparing' && (
                  <button onClick={() => updateStatus(order, 'Served')} className="btn-primary !bg-blue-600 hover:!bg-blue-700 !h-10 text-[12px] col-span-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" /> Mark as Served
                  </button>
                )}
                {order.status === 'Served' && (
                  <button onClick={() => updateStatus(order, 'Completed')} className="btn-primary !bg-green-600 hover:!bg-green-700 !h-10 text-[12px] col-span-2">
                    <FontAwesomeIcon icon={faCheckDouble} className="mr-2" /> Complete Order
                  </button>
                )}
                
                <button onClick={() => handleEditOrder(order)} className="btn-secondary !h-10 text-[12px] flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faPen} /> Edit
                </button>
                <button onClick={() => handlePrintKOT(order)} className="btn-secondary !h-10 text-[12px] flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faPrint} /> KOT
                </button>
                <button onClick={() => { setConfirmDelete(order); }} className="btn-secondary !text-rose-500 !h-10 text-[12px] flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faTrash} /> Cancel
                </button>
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && (
            <div className="col-span-full py-20 text-center card opacity-50">
              <FontAwesomeIcon icon={faClipboardList} className="text-[60px] text-brand-muted mb-4" />
              <h3 className="text-[18px] font-bold">No active orders</h3>
              <p className="text-[14px]">Take a new order from the 'New Order' tab.</p>
            </div>
          )}
        </div>
      )}


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

          <div className="text-center border-b-2 border-black pb-2 mb-4">
            <h2 className="text-[20px] font-bold">KITCHEN ORDER</h2>
            <p className="text-[14px]">#{kotPrint._id.slice(-6).toUpperCase()}</p>
            <p className="text-[12px]">{new Date().toLocaleString()}</p>
          </div>
          
          <div className="mb-4 text-[14px]">
            <p className="flex justify-between"><strong>TYPE:</strong> <span>{kotPrint.orderType}</span></p>
            <p className="flex justify-between"><strong>TABLE/ROOM:</strong> <span>{kotPrint.tableName ? `Table ${kotPrint.tableName}` : `Room ${guests.find(g => g._id === kotPrint.guestId)?.roomNo || 'N/A'}`}</span></p>
            <p className="flex justify-between"><strong>WAITER:</strong> <span>Waiter Panel</span></p>
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

      <ConfirmDialog 
        open={!!confirmDelete} 
        message="Are you sure you want to cancel and delete this order?" 
        onClose={() => setConfirmDelete(null)} 
        onConfirm={async () => {
          try {
            await api.deleteItem('/restaurant-orders', confirmDelete._id);
            notifySuccess('Order cancelled successfully');
            setConfirmDelete(null);
            loadData();
          } catch (err) {
            notifyError('Failed to cancel order');
          }
        }} 
      />

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
    </div>
  );
}
