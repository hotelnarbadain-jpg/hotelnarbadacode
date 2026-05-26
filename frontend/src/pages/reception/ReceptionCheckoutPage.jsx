import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faChair, faReceipt, faMoneyBillWave, faCreditCard, faMobileRetro, faFileInvoiceDollar, faCheckCircle, faCalendarCheck, faClock, faPrint, faArrowLeft, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CheckoutSkeleton } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import { BillPrintContent } from '../BillsManagementPage';
import client from '../../api/client';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

// - [x] Update room filtering logic in `ReceptionCheckoutPage.jsx`
// - [x] Refine loading states in `ReceptionCheckoutPage.jsx`
// - [x] Verify fix by reviewing the code and logic
// - [x] Fix print styles in `BillsManagementPage.jsx`
// - [x] Implement KOT portal in `RestaurantPage.jsx`
// - [x] Implement KOT portal in `WaiterRestaurantPage.jsx`

export default function ReceptionCheckoutPage({ api, updateTrigger }) {
  const location = useLocation();
  const navigate = useNavigate();
  const editBill = location.state?.editBill || null;
  
  const [rooms, setRooms] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('ROOM');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(editBill?.restaurantItems || []);
  const [restTables, setRestTables] = useState([]);
  const [restOrders, setRestOrders] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);

  const [billing, setBilling] = useState(() => ({
    extraItems: 0,
    discountType: 'FIXED',
    discountValue: editBill ? (editBill.discount || 0) : 0,
    paymentType: editBill ? (editBill.paymentType || 'Full payment') : 'Full payment',
    paymentMethod: editBill ? (editBill.paymentMethod || 'Cash') : 'Cash',
    amountPaid: editBill ? (editBill.amountPaid || 0) : 0,
  }));

  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);

  const loadData = async () => {
    if (rooms.length === 0) setLoading(true);
    try {
      const [roomRows, guestRows, hotelProfile, itemRows, tableRows, orderRows] = await Promise.all([
        api.fetchList('/rooms'),
        api.fetchList('/guests'),
        client.get('/profile').then(res => res.data),
        api.fetchList('/inventory-items'),
        api.fetchList('/restaurant-tables'),
        api.fetchList('/restaurant-orders')
      ]);

      const checkedInGuests = guestRows.filter(g => g.status === 'Checked In');
      
      // Collect all room numbers assigned to active guests
      const guestRoomNos = new Set();
      checkedInGuests.forEach(g => {
        if (g.rooms && g.rooms.length > 0) {
          g.rooms.forEach(r => guestRoomNos.add(r.roomNo));
        } else if (g.roomNo) {
          g.roomNo.split(', ').forEach(rn => guestRoomNos.add(rn.trim()));
        }
      });

      // Show rooms that are either marked 'Occupied' OR assigned to a checked-in guest
      setRooms(roomRows.filter(r => r.status === 'Occupied' || guestRoomNos.has(r.roomNo)));
      setAllGuests(checkedInGuests);
      setProfile(hotelProfile);
      setInventoryItems(itemRows.filter(i => i.showInCheckout !== false));
      setRestTables(tableRows.filter(t => t.status === 'Occupied'));
      setRestOrders(orderRows.filter(o => o.status !== 'Completed' || o.paymentMethod === 'Room Charge'));
    } catch (err) {
      notifyError('Failed to load checkout data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [updateTrigger]);

  const handleRoomSelect = (roomId) => {
    setSelectedRoomId(roomId);
    if (!roomId) {
      setSelectedGuest(null);
      setSelectedItems([]);
      return;
    }
    const room = rooms.find(r => r._id === roomId);
    if (!room) return;

    const guest = allGuests.find(g => 
      (g.rooms || []).some(rg => rg.roomNo === room.roomNo) || 
      g.roomNo === room.roomNo ||
      (g.roomNo && g.roomNo.split(', ').includes(room.roomNo))
    );
    setSelectedGuest(guest);

    if (guest) {
        const roomOrders = restOrders.filter(o => String(o.guestId) === String(guest._id) && ['Room Charge', 'Credit'].includes(o.paymentMethod));
        const orderItems = [];
        roomOrders.forEach(order => {
          order.items.forEach(item => {
            orderItems.push({ 
              item: `Rest. Order #${order._id.slice(-4).toUpperCase()} - ${item.name}`, 
              qty: item.quantity, 
              price: item.price, 
              total: item.subtotal,
              itemId: item.itemId,
              fromOrder: true 
            });
          });
        });
        setSelectedItems(orderItems);
    } else {
      setSelectedItems([]);
    }
  };

  const handleTableSelect = (tableId) => {
    setSelectedTableId(tableId);
    if (!tableId) {
        setSelectedItems([]);
        return;
    }
    const tableOrders = restOrders.filter(o => o.tableId === tableId && o.paymentMethod !== 'Room Charge');
    const orderItems = [];
    tableOrders.forEach(order => {
      order.items.forEach(item => {
        orderItems.push({ 
          item: `Rest. Order #${order._id.slice(-4).toUpperCase()} - ${item.name}`, 
          qty: item.quantity, 
          price: item.price, 
          total: item.subtotal,
          itemId: item.itemId,
          fromOrder: true 
        });
      });
    });
    setSelectedItems(orderItems);
  };

  const calculated = useMemo(() => {
    const restaurantAmt = selectedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    if (editBill) {
      const roomTotal = editBill.rooms?.reduce((s, r) => s + (r.total || 0), 0) || 0;
      const gross = roomTotal + restaurantAmt;
      const discountAmt = Number(billing.discountValue || 0);
      const grand = Math.max(0, gross - discountAmt);
      return { nights: 1, roomTotal, gross, discount: discountAmt, grand, restaurantAmt, advancePayment: 0, netPayable: grand };
    }

    if (tab === 'TABLE') {
        const gross = restaurantAmt + Number(billing.extraItems || 0);
        const discountAmt = billing.discountType === 'PERCENT' ? (gross * Number(billing.discountValue || 0)) / 100 : Number(billing.discountValue || 0);
        const grand = Math.max(0, gross - discountAmt);
        return { nights: 0, roomTotal: 0, gross, discount: discountAmt, grand, restaurantAmt, advancePayment: 0, netPayable: grand };
    }

    if (!selectedGuest) return { nights: 0, roomTotal: 0, gross: 0, discount: 0, grand: 0, restaurantAmt: 0, advancePayment: 0, netPayable: 0 };

    const checkInBase = new Date(selectedGuest.checkInDate);
    const timeParts = (selectedGuest.checkInTime || '12:00').split(':');
    const checkIn = new Date(checkInBase.getFullYear(), checkInBase.getMonth(), checkInBase.getDate(), parseInt(timeParts[0]), parseInt(timeParts[1]));
    const now = new Date();
    const d1 = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    const finalNights = Math.max(1, dayDiff + (now.getHours() >= 12 ? 1 : 0));

    const pricePerNight = (selectedGuest.rooms || []).reduce((sum, r) => sum + (Number(r.price) || 0), 0) || Number(selectedGuest.price || 0);
    const roomTotal = finalNights * pricePerNight;
    const gross = roomTotal + restaurantAmt + Number(billing.extraItems || 0);
    const discountAmt = billing.discountType === 'PERCENT' ? (gross * Number(billing.discountValue || 0)) / 100 : Number(billing.discountValue || 0);

    const advancePayment = Number(selectedGuest.advancePayment || 0);

    const grand = Math.max(0, gross - discountAmt);
    const netPayable = Math.max(0, grand - advancePayment);

    return { nights: finalNights, roomTotal, gross, discount: discountAmt, grand, restaurantAmt, advancePayment, netPayable };
  }, [editBill, selectedGuest, selectedItems, billing.extraItems, billing.discountType, billing.discountValue, rooms, tab]);

  const handleUpdateBill = async () => {
    setSubmitting(true);
    try {
      const isPartial = billing.paymentType === 'Partial payment';
      const amountPaid = isPartial ? Number(billing.amountPaid || 0) : calculated.grand;
      const totalDue = isPartial ? Math.max(0, calculated.grand - amountPaid) : 0;

      await api.updateItem('/bills', editBill._id, {
        restaurantItems: selectedItems,
        subTotal: calculated.gross,
        discount: calculated.discount,
        grandTotal: calculated.grand,
        amountPaid,
        totalDue,
        paymentType: billing.paymentType,
        paymentMethod: billing.paymentMethod,
      });
      notifySuccess('Bill updated successfully');
      navigate('/reception/bills-management');
    } catch (err) {
      notifyError('Failed to update bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      const isPartial = billing.paymentType === 'Partial payment';
      const remainingToPay = Math.max(0, calculated.grand - (calculated.advancePayment || 0));
      const amountPaidNow = isPartial ? Number(billing.amountPaid || 0) : remainingToPay;
      const totalAmountPaid = (calculated.advancePayment || 0) + amountPaidNow;
      const totalDue = isPartial ? Math.max(0, calculated.grand - totalAmountPaid) : 0;

      let newBill;
      if (tab === 'ROOM') {
        const guestRooms = selectedGuest.rooms?.length > 0 ? selectedGuest.rooms : [{ roomNo: selectedGuest.roomNo }];
        for (const gr of guestRooms) {
            const roomObj = rooms.find(r => r.roomNo === gr.roomNo);
            if (roomObj) await api.updateItem('/rooms', roomObj._id, { status: 'Dirty' });
        }
        const roomDesc = guestRooms.map(r => r.roomNo).join(', ');
        if (amountPaidNow > 0) {
            await api.createItem('/financials', { title: `Checkout - Room ${roomDesc} (${selectedGuest.name})${isPartial ? ' [Partial]' : ''}`, amount: amountPaidNow, type: 'Income', date: new Date() });
        }

        const roomOrders = restOrders.filter(o => String(o.guestId) === String(selectedGuest._id) && ['Room Charge', 'Credit'].includes(o.paymentMethod));
        for (const order of roomOrders) {
            await api.updateItem('/restaurant-orders', order._id, { 
                status: 'Completed',
                paymentMethod: billing.paymentMethod
            });
        }

        await api.updateItem('/guests', selectedGuest._id, { status: 'Checked Out', checkOutDate: new Date(), totalDue: totalDue });

        newBill = await api.createItem('/bills', {
            guestId: selectedGuest._id, guestName: selectedGuest.name, contactNo: selectedGuest.phone, roomNo: roomDesc,
            totalGuests: selectedGuest.noOfGuest || 1, checkIn: selectedGuest.checkInDate, checkOut: new Date(),
            rooms: guestRooms.map(r => ({ roomNo: r.roomNo, price: r.price || selectedGuest.price, total: (Number(r.price) || Number(selectedGuest.price)) * calculated.nights })),
            restaurantItems: selectedItems, subTotal: calculated.gross, discount: calculated.discount, grandTotal: calculated.grand, advancePaid: calculated.advancePayment, amountPaid: totalAmountPaid, totalDue: totalDue, paymentType: billing.paymentType, paymentMethod: billing.paymentMethod
        });
      } else {
        const table = restTables.find(t => t._id === selectedTableId);
        const tableOrders = restOrders.filter(o => o.tableId === selectedTableId && o.paymentMethod !== 'Room Charge');
        const customerName = tableOrders[0]?.guestName || 'Normal Person';

        if (amountPaidNow > 0) {
            await api.createItem('/financials', { title: `Restaurant Checkout - Table ${table?.number} (${customerName})${isPartial ? ' [Partial]' : ''}`, amount: amountPaidNow, type: 'Income', date: new Date() });
        }
        
        for (const order of tableOrders) {
            await api.updateItem('/restaurant-orders', order._id, { 
                status: 'Completed',
                paymentMethod: billing.paymentMethod
            });
        }

        newBill = await api.createItem('/bills', {
            guestName: customerName, roomNo: `Table ${table?.number}`, checkIn: tableOrders[0]?.createdAt || new Date(), checkOut: new Date(),
            rooms: [], restaurantItems: selectedItems, subTotal: calculated.gross, discount: calculated.discount, grandTotal: calculated.grand, amountPaid: totalAmountPaid, totalDue: totalDue, paymentType: billing.paymentType, paymentMethod: billing.paymentMethod
        });
      }

      notifySuccess('Checkout processed successfully');
      setCreatedBill(newBill);
      setShowSuccess(true);
      setConfirmCheckout(false);
      setSelectedRoomId('');
      setSelectedTableId('');
      setSelectedGuest(null);
      setSelectedItems([]);
      loadData();
    } catch (err) {
      notifyError('Failed to process checkout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[400px]">
      {submitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]">
          <div className="spinner"></div>
          <p className="text-[13px] font-bold tracking-widest text-brand-muted">{editBill ? 'Updating Bill...' : 'Finalizing Checkout...'}</p>
        </div>
      )}

      {loading && !editBill ? (
        <CheckoutSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 -mt-4 lg:-mt-8">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-2">
              {editBill && (
                <button onClick={() => navigate('/reception/bills-management')} className="btn-secondary !h-9 !px-3">
                  <FontAwesomeIcon icon={faArrowLeft} />
                </button>
              )}
              <PageHeader title={editBill ? `Edit Bill: ${editBill.billNo}` : 'Checkout Management'} subtitle={editBill ? 'Adjust financial details — room & guest info is locked' : 'Process checkouts & billing system'} />
            </div>

            {editBill ? (
              <div className="card p-6 border-amber-200 bg-gradient-to-br from-white to-amber-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon icon={faPenToSquare} className="text-amber-500" />
                  <span className="text-[12px] font-black uppercase tracking-widest text-amber-600">Editing Existing Bill</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px] font-bold">
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Guest</p><p className="text-slate-800">{editBill.guestName}</p></div>
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Room(s)</p><p className="text-brand-blue font-black">{editBill.roomNo}</p></div>
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Check-In</p><p className="text-slate-800">{new Date(editBill.checkIn).toLocaleDateString()}</p></div>
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Check-Out</p><p className="text-slate-800">{new Date(editBill.checkOut).toLocaleDateString()}</p></div>
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Nights</p><p className="text-slate-800">{calculated.nights}</p></div>
                  <div><p className="text-brand-muted text-[11px] uppercase tracking-widest mb-0.5">Room Total</p><p className="text-slate-800">Rs. {calculated.roomTotal.toLocaleString()}</p></div>
                </div>
                <div className="mt-5 border-t border-amber-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[12.5px] font-bold text-slate-500 pl-1 block">Restaurant / Orders (Inventory Items)</label>
                    <div className="flex gap-2">
                      <select className="input !h-8 !py-0 !text-[11px] !w-[180px]" onChange={(e) => {
                          const item = inventoryItems.find(i => i._id === e.target.value);
                          if (item) {
                            const price = Number(item.sellingPrice || 0);
                            setSelectedItems([...selectedItems, { item: item.name, qty: 1, price: price, total: price, itemId: item._id }]);
                            e.target.value = "";
                          }
                        }}>
                        <option value="">+ Add Item...</option>
                        {inventoryItems.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr,60px,100px,100px,32px] gap-2 items-center">
                        <input className="input !h-9 text-[12px]" placeholder="Item..." value={it.item} onChange={(e) => { const ni = [...selectedItems]; ni[idx].item = e.target.value; setSelectedItems(ni); }} />
                        <input type="number" className="input !h-9 text-[12px]" placeholder="Qty" value={it.qty} onChange={(e) => { const ni = [...selectedItems]; ni[idx].qty = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                        <input type="number" className="input !h-9 text-[12px]" placeholder="Price" value={it.price} onChange={(e) => { const ni = [...selectedItems]; ni[idx].price = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                        <div className="input !h-9 text-[12px] bg-slate-50 flex items-center justify-end font-bold">{Number(it.total).toLocaleString()}</div>
                        <button className="text-rose-500 hover:text-rose-700" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}><FontAwesomeIcon icon={faTrash} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-fit mb-6 border border-brand-border">
                  <button onClick={() => { setTab('ROOM'); setSelectedItems([]); setSelectedTableId(''); }} className={`flex items-center justify-center gap-2.5 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all duration-300 ${tab === 'ROOM' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>
                    <FontAwesomeIcon icon={faBed} /> Room Checkout
                  </button>
                  <button onClick={() => { setTab('TABLE'); setSelectedItems([]); setSelectedRoomId(''); setSelectedGuest(null); }} className={`flex items-center justify-center gap-2.5 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all duration-300 ${tab === 'TABLE' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>
                    <FontAwesomeIcon icon={faChair} /> Table Checkout
                  </button>
                </div>

                {tab === 'ROOM' ? (
                  <div className="card p-6 border-brand-blue/10">
                    <label className="text-[13px] font-bold text-brand-blue mb-3 block">Select occupied room</label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faBed} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/50" />
                      <select className="input !h-[52px] !pl-12 text-[15px] font-bold border-brand-blue/20 cursor-pointer" value={selectedRoomId} onChange={(e) => handleRoomSelect(e.target.value)}>
                        <option value="">-- Select Room Number --</option>
                        {rooms.map(r => <option key={r._id} value={r._id}>{r.roomNo} ({r.category})</option>)}
                      </select>
                    </div>
                    {selectedGuest && (
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div className="bg-slate-50 rounded-2xl p-5 border border-brand-border">
                          <p className="text-[12px] font-bold text-brand-muted mb-2">Guest overview</p>
                          <h3 className="text-[18px] font-black text-slate-800 leading-none mb-2">{selectedGuest.name}</h3>
                          <div className="mt-4 flex flex-col gap-2 border-t border-brand-border pt-4 text-[12.5px] font-bold">
                            <div className="flex justify-between"><span>Check-in</span><span>{new Date(selectedGuest.checkInDate).toLocaleDateString()}</span></div>
                            <div className="flex justify-between"><span>Duration</span><span>{calculated.nights} Nights</span></div>
                            <div className="flex justify-between border-t border-dashed pt-2 mt-1"><span>Rooms</span><span className="text-brand-blue font-black">{(selectedGuest.rooms || []).map(r => r.roomNo).join(', ') || selectedGuest.roomNo}</span></div>
                          </div>
                        </div>
                        <div className="mt-4 border-t border-brand-border pt-4">
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-[12px] font-extrabold text-brand-blue uppercase">Restaurant / Orders</label>
                              <select className="input !h-8 !py-0 !text-[11px] !w-[160px]" onChange={(e) => {
                                  const item = inventoryItems.find(i => i._id === e.target.value);
                                  if (item) {
                                    const price = Number(item.sellingPrice || 0);
                                    setSelectedItems([...selectedItems, { item: item.name, qty: 1, price: price, total: price, itemId: item._id }]);
                                    e.target.value = "";
                                  }
                                }}>
                                <option value="">+ Add Item...</option>
                                {inventoryItems.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {selectedItems.map((it, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr,50px,80px,80px,24px] gap-2 items-center text-[12px]">
                                  <input className="input !h-8 !px-2 !text-[11px]" value={it.item} onChange={(e) => { const ni = [...selectedItems]; ni[idx].item = e.target.value; setSelectedItems(ni); }} />
                                  <input type="number" className="input !h-8 !px-2 !text-[11px]" value={it.qty} onChange={(e) => { const ni = [...selectedItems]; ni[idx].qty = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                                  <input type="number" className="input !h-8 !px-2 !text-[11px]" value={it.price} onChange={(e) => { const ni = [...selectedItems]; ni[idx].price = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                                  <div className="text-right font-bold">₹{it.total.toLocaleString()}</div>
                                  <button className="text-rose-500 hover:text-rose-700 text-[10px]" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}><FontAwesomeIcon icon={faTrash} /></button>
                                </div>
                              ))}
                              {selectedItems.length === 0 && <p className="text-[11px] text-brand-muted italic text-center">No orders found.</p>}
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card p-6 border-brand-blue/10">
                    <label className="text-[13px] font-bold text-brand-blue mb-3 block">Select occupied table</label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faChair} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/50" />
                      <select className="input !h-[52px] !pl-12 text-[15px] font-bold border-brand-blue/20 cursor-pointer" value={selectedTableId} onChange={(e) => handleTableSelect(e.target.value)}>
                        <option value="">-- Select Table Number --</option>
                        {restTables.map(t => <option key={t._id} value={t._id}>Table {t.number}</option>)}
                      </select>
                    </div>
                    {selectedTableId && (
                        <div className="mt-8 animate-fadeIn">
                             <div className="flex items-center justify-between mb-4">
                                <label className="text-[12px] font-extrabold text-brand-blue uppercase">Table Orders</label>
                                <select className="input !h-8 !py-0 !text-[11px] !w-[160px]" onChange={(e) => {
                                    const item = inventoryItems.find(i => i._id === e.target.value);
                                    if (item) {
                                      const price = Number(item.sellingPrice || 0);
                                      setSelectedItems([...selectedItems, { item: item.name, qty: 1, price: price, total: price, itemId: item._id }]);
                                      e.target.value = "";
                                    }
                                  }}>
                                  <option value="">+ Add Item...</option>
                                  {inventoryItems.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
                                </select>
                             </div>
                             <div className="space-y-2 card p-5 bg-slate-50 overflow-y-auto max-h-[300px]">
                                {selectedItems.map((it, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr,50px,80px,80px,24px] gap-2 items-center text-[12px]">
                                        <input className="input !h-8 !px-2 !text-[11px]" value={it.item} onChange={(e) => { const ni = [...selectedItems]; ni[idx].item = e.target.value; setSelectedItems(ni); }} />
                                        <input type="number" className="input !h-8 !px-2 !text-[11px]" value={it.qty} onChange={(e) => { const ni = [...selectedItems]; ni[idx].qty = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                                        <input type="number" className="input !h-8 !px-2 !text-[11px]" value={it.price} onChange={(e) => { const ni = [...selectedItems]; ni[idx].price = Number(e.target.value); ni[idx].total = ni[idx].qty * ni[idx].price; setSelectedItems(ni); }} />
                                        <div className="text-right font-bold">₹{it.total.toLocaleString()}</div>
                                        <button className="text-rose-500 hover:text-rose-700 text-[10px]" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                ))}
                                {selectedItems.length === 0 && <p className="text-[11px] text-brand-muted italic text-center">No items found for this table.</p>}
                             </div>
                        </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-4 h-fit sticky top-[15px]">
            <div className="card p-5 border-brand-border shadow-xl">
              <div className="flex items-center gap-3 mb-5"><div className="grid h-9 w-9 place-content-center rounded-xl bg-brand-soft text-brand-blue"><FontAwesomeIcon icon={faReceipt} /></div><h3 className="text-[15px] font-black text-slate-800">Billing summary</h3></div>
              <div className="space-y-3.5 border-b border-brand-border pb-5">
                <div className="flex justify-between text-[13.5px] font-bold"><span className="text-slate-500">Room total</span><span>Rs. {calculated.roomTotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-[13.5px] font-bold text-slate-500"><span>Restaurant / Orders</span><span>Rs. {calculated.restaurantAmt.toLocaleString()}</span></div>
                <div className="flex justify-between text-[13.5px] font-black pt-2.5 text-slate-800 border-t"><span>Gross Total</span><span className="text-[16px]">Rs. {calculated.gross.toLocaleString()}</span></div>
              </div>
              <div className="mt-5 p-4 bg-slate-50 border border-brand-border rounded-xl border-dashed">
                <div className="flex items-center justify-between mb-3"><p className="text-[12.5px] font-bold text-slate-500">Discount</p><div className="flex bg-white border p-0.5 rounded-lg shadow-sm"><button onClick={() => setBilling({ ...billing, discountType: 'PERCENT' })} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${billing.discountType === 'PERCENT' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-muted'}`}>% Percent</button><button onClick={() => setBilling({ ...billing, discountType: 'FIXED' })} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${billing.discountType === 'FIXED' ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-muted'}`}>₹ Fixed</button></div></div>
                <input className="input !h-12 !pl-4 text-right font-black text-brand-blue text-[15px]" type="number" value={billing.discountValue} onChange={(e) => setBilling({ ...billing, discountValue: e.target.value })} />
              </div>

              {calculated.advancePayment > 0 && (
                <div className="my-4 flex items-center justify-between">
                    <p className="text-[13px] font-bold text-emerald-500">Advance Paid</p>
                    <p className="text-[15px] font-black text-emerald-500">- Rs. {calculated.advancePayment.toLocaleString()}</p>
                </div>
              )}

              <div className="my-6 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-slate-500">Total Amount</p>
                  <p className="text-[18px] font-bold text-slate-700">Rs. {calculated.grand.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between border-t border-brand-border pt-2">
                  <p className="text-[15px] font-black text-slate-800 uppercase tracking-tight">Remaining Total</p>
                  <p className="text-[28px] font-black text-brand-blue">Rs. {calculated.netPayable.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <select className="input font-bold" value={billing.paymentType} onChange={(e) => setBilling({ ...billing, paymentType: e.target.value, amountPaid: Math.max(0, calculated.grand - (calculated.advancePayment || 0)) })}><option>Full payment</option><option>Partial payment</option><option>Complimentary</option></select>
                {billing.paymentType === 'Partial payment' && (
                  <div className="grid grid-cols-2 gap-3 mt-4 animate-fadeIn">
                    <div><label className="text-[12px] font-bold text-brand-blue block uppercase">Paying Now</label><input type="number" className="input font-black text-brand-blue" value={billing.amountPaid} onChange={(e) => setBilling({ ...billing, amountPaid: e.target.value })} /></div>
                    <div><label className="text-[12px] font-bold text-slate-400 block uppercase">Due</label><div className="input bg-slate-50 flex items-center font-black text-rose-500 border-dashed">Rs. {Math.max(0, calculated.grand - (calculated.advancePayment || 0) - (Number(billing.amountPaid) || 0)).toLocaleString()}</div></div>
                  </div>
                )}
                <select className="input font-bold" value={billing.paymentMethod} onChange={(e) => setBilling({ ...billing, paymentMethod: e.target.value })}><option>Cash</option><option>Bank Transfer</option><option>fonepay / QR</option><option>Credit Card</option></select>
              </div>
              <button disabled={(!selectedGuest && !selectedTableId && !editBill) || submitting} onClick={() => setConfirmCheckout(true)} className={`w-full !h-12 mt-6 flex items-center justify-center gap-2.5 text-[15px] font-bold transition-all ${editBill ? 'btn-warning' : 'btn-success'} ${(!selectedGuest && !selectedTableId && !editBill) ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-lg'}`}>
                <FontAwesomeIcon icon={editBill ? faPenToSquare : faFileInvoiceDollar} /> {editBill ? 'Update Bill' : 'Process checkout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        open={confirmCheckout} 
        title={editBill ? 'Confirm Bill Update' : 'Finalize Checkout'} 
        message={editBill ? `Update bill ${editBill.billNo}?` : `Process checkout for ${tab === 'ROOM' ? selectedGuest?.name : 'Table ' + restTables.find(t => t._id === selectedTableId)?.number}?`} 
        onClose={() => setConfirmCheckout(false)} 
        onConfirm={editBill ? handleUpdateBill : handleCheckout}
        confirmText={editBill ? 'Update Bill' : 'Process Checkout'}
        confirmClass={editBill ? 'btn-warning' : 'btn-success'}
      />
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} width="1000px" title="Checkout Successful" actions={<button className="btn-primary" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} /> Print Bill</button>}>
        <div className="text-center mb-6 no-print"><div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-[32px] mb-4"><FontAwesomeIcon icon={faCheckCircle} /></div><h2 className="text-[20px] font-black text-slate-800">Checkout Completed!</h2></div>
        {createdBill && <BillPrintContent bill={createdBill} profile={profile} onClose={() => setShowSuccess(false)} />}
      </Modal>
    </div>
  );
}
