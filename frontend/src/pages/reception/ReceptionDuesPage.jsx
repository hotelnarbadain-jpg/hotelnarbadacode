import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faClock, faMoneyBillWave, faCheckCircle, faSearch, faReceipt } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

const paymentMethods = ['Cash', 'Bank Transfer', 'fonepay / QR', 'Credit Card'];

const CardSkeleton = () => (
  <div className="card p-6 animate-pulse border-rose-100 bg-gradient-to-br from-white to-rose-50/20">
    <div className="flex items-center justify-between mb-4">
      <div className="h-12 w-12 rounded-2xl bg-rose-200" />
      <div className="flex flex-col items-end gap-2">
        <div className="h-3 w-20 rounded bg-rose-200" />
        <div className="h-6 w-32 rounded bg-rose-300" />
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

export default function ReceptionDuesPage({ api, updateTrigger }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Payment Modal State
  const [activeGuest, setActiveGuest] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const loadData = async () => {
    if (guests.length === 0) setLoading(true);
    try {
      // Add 1s delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const [allGuests, allBills, allOrders] = await Promise.all([
        api.fetchList('/guests'),
        api.fetchList('/bills'),
        api.fetchList('/restaurant-orders')
      ]);

      // Master Map to aggregate everything by guest
      const duesMap = new Map();

      // 1. Add all guests who have a profile totalDue
      allGuests.forEach(g => {
        if ((g.totalDue || 0) > 0) {
          duesMap.set(g._id.toString(), {
            _id: g._id,
            name: g.name,
            phone: g.phone,
            status: g.status,
            totalDue: g.totalDue,
            checkInDate: g.checkInDate,
            createdAt: g.createdAt,
            pendingBills: [],
            pendingOrders: []
          });
        }
      });

      // 2. Add/Update from Bills
      allBills.forEach(b => {
        if ((b.totalDue || 0) > 0) {
          const key = b.guestId?._id?.toString() || b.guestId?.toString() || `bill-name-${b.guestName}`;
          if (duesMap.has(key)) {
            const existing = duesMap.get(key);
            if (!existing.pendingBills.find(pb => pb._id === b._id)) {
              existing.pendingBills.push(b);
            }
          } else {
            duesMap.set(key, {
              _id: b.guestId || key,
              name: b.guestName || 'Unknown Guest',
              phone: b.contactNo,
              status: 'Bill Pending',
              totalDue: b.totalDue,
              checkInDate: b.checkIn,
              createdAt: b.createdAt,
              pendingBills: [b],
              pendingOrders: []
            });
          }
        }
      });

      // 3. Add/Update from Restaurant Orders
      allOrders.forEach(o => {
        // A restaurant order is an independent due ONLY if it's 'Credit' and not yet paid.
        // 'Room Charge' orders are consolidated into the room bill and handled there.
        const isUnpaidCreditOrder = o.paymentMethod === 'Credit' && o.status === 'Completed';
        
        if (isUnpaidCreditOrder) {
          const key = o.guestId?._id?.toString() || o.guestId?.toString() || `order-name-${o.guestName}`;
          
          if (duesMap.has(key)) {
            const existing = duesMap.get(key);
            if (!existing.pendingOrders.find(po => po._id === o._id)) {
              existing.pendingOrders.push(o);
            }
          } else {
            duesMap.set(key, {
              _id: o.guestId || key,
              name: o.guestName || 'Restaurant Guest',
              phone: 'N/A',
              status: 'Credit Guest',
              totalDue: o.totalAmount,
              checkInDate: null,
              createdAt: o.createdAt,
              pendingBills: [],
              pendingOrders: [o]
            });
          }
        }
      });

      // 4. Convert map back to array and ensure totalDue reflects the breakdown accurately
      const processedGuests = Array.from(duesMap.values()).map(g => {
        const billTotal = g.pendingBills.reduce((sum, b) => sum + (Number(b.totalDue) || 0), 0);
        const orderTotal = g.pendingOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        
        // Use the breakdown total for checked-out or credit guests.
        // For Checked In guests, we use their current profile totalDue but ensure it's not less than their known bills/orders
        let finalTotal = billTotal + orderTotal;
        if (g.status === 'Checked In' && g.totalDue > finalTotal) {
            finalTotal = g.totalDue;
        }

        return { ...g, totalDue: finalTotal };
      }).filter(g => {
        const name = g.name?.toLowerCase() || '';
        // Remove 'Normal Person' and generic 'Restaurant Guest' as requested
        // Keep 'Ghanashyam' and other specific guests
        if (name.includes('normal person') || name.includes('restaurant guest') || name === 'unknown guest') {
          return false;
        }
        return g.totalDue > 0;
      });

      setGuests(processedGuests);

    } catch (err) {
      console.error('Dues Load Error:', err);
      notifyError('Failed to load dues data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [updateTrigger]);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.phone?.includes(search)
  );

  const openPayment = (guest) => {
    setActiveGuest(guest);
    setPaymentAmount(guest.totalDue);
    setPaymentMethod('Cash');
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return notifyError('Invalid payment amount');
    if (amount > activeGuest.totalDue) return notifyError('Payment cannot exceed total due');

    setSubmitting(true);
    try {
      const amountToPay = Number(paymentAmount);
      let remainingPayment = amountToPay;
      
      // 1. Update Guest Due (Only for real hotel guests)
      const isRealGuest = activeGuest.status !== 'Credit Guest' && !activeGuest._id.toString().startsWith('bill-name-') && !activeGuest._id.toString().startsWith('order-name-');
      
      if (isRealGuest) {
        const newGuestDue = Math.max(0, (activeGuest.totalDue || 0) - amountToPay);
        await api.updateItem('/guests', activeGuest._id, {
          totalDue: newGuestDue
        });
      }

      // 2. Record Financial Entry
      await api.createItem('/financials', {
        title: `Due Payment - ${activeGuest.name}`,
        amount: amountToPay,
        type: 'Income',
        date: new Date()
      });

      // 3. Update related bills (Handle multiple bills if any)
      const allBills = await api.fetchList('/bills');
      const guestBills = allBills
        .filter(b => (b.guestId?._id || b.guestId) === activeGuest._id && (b.totalDue || 0) > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Pay oldest bills first

      for (const bill of guestBills) {
        if (remainingPayment <= 0) break;

        const paymentForThisBill = Math.min(bill.totalDue, remainingPayment);
        const updatedBillDue = bill.totalDue - paymentForThisBill;
        const updatedAmountPaid = (bill.amountPaid || 0) + paymentForThisBill;
        
        const updateData = { 
          totalDue: updatedBillDue, 
          amountPaid: updatedAmountPaid 
        };
        
        if (updatedBillDue <= 0) {
          updateData.paymentType = 'Full payment';
        }

        await api.updateItem('/bills', bill._id, updateData);
        remainingPayment -= paymentForThisBill;
      }

      // 4. Update related restaurant orders (Credit orders)
      const allOrders = await api.fetchList('/restaurant-orders');
      const guestOrders = allOrders
        .filter(o => {
          const key = o.guestId?._id?.toString() || o.guestId?.toString() || `order-name-${o.guestName}`;
          return key === activeGuest._id.toString() && o.paymentMethod === 'Credit' && o.status === 'Completed';
        })
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (const order of guestOrders) {
        if (remainingPayment <= 0) break;
        if (remainingPayment >= order.totalAmount) {
          await api.updateItem('/restaurant-orders', order._id, { paymentMethod: 'Cash' });
          remainingPayment -= order.totalAmount;
        }
      }

      notifySuccess(`Payment of Rs. ${amountToPay.toLocaleString()} received and applied to bills/orders`);
      setActiveGuest(null);
      loadData();
    } catch (err) {
      console.error('Payment Error:', err);
      notifyError('Failed to process payment completely');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[400px]">
      <PageHeader
        title="Dues Management"
        subtitle="Manage & collect outstanding guest balances"
        actions={
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input className="input !pl-11" placeholder="Search by guest name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGuests.map((guest) => (
            <div key={guest._id} className="card group overflow-hidden transition-all hover:shadow-lg border-rose-100 bg-gradient-to-br from-white to-rose-50/20">
               <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <div className="grid h-12 w-12 place-content-center rounded-2xl bg-rose-100 text-rose-600 transition-transform group-hover:scale-110">
                        <FontAwesomeIcon icon={faUser} className="text-[20px]" />
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Outstanding Due</p>
                        <p className="text-[22px] font-black text-rose-600 tracking-tight">Rs. {guest.totalDue?.toLocaleString()}</p>
                     </div>
                  </div>

                  <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{guest.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${guest.status === 'Credit Guest' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {guest.status || 'Guest'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-brand-border pt-4">
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faPhone} className="mr-2" /> Phone</span>
                        <span className="text-slate-700">{guest.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faClock} className="mr-2" /> {guest.status === 'Credit Guest' ? 'Record Created' : 'Last Visit'}</span>
                        <span className="text-slate-700">{guest.checkInDate ? new Date(guest.checkInDate).toLocaleDateString() : new Date(guest.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Breakdown Section */}
                  <div className="mt-4 pt-3 border-t border-dashed border-brand-border space-y-2">
                    <p className="text-[10px] font-black uppercase text-brand-muted mb-2">Source of Due</p>
                    
                    {guest.pendingBills?.map(bill => (
                      <div key={bill._id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-[11px] font-bold border border-slate-100">
                        <span className="text-slate-600 truncate max-w-[120px]">Room Bill #{bill.billNo}</span>
                        <span className="text-rose-600">Rs. {bill.totalDue?.toLocaleString()}</span>
                      </div>
                    ))}

                    {guest.pendingOrders?.map(order => (
                      <div key={order._id} className="flex justify-between items-center bg-blue-50 p-2 rounded-lg text-[11px] font-bold border border-blue-100">
                        <span className="text-blue-700 truncate max-w-[120px]">Rest. Order #{order._id.slice(-5).toUpperCase()}</span>
                        <span className="text-blue-800">Rs. {order.totalAmount?.toLocaleString()}</span>
                      </div>
                    ))}

                    {!guest.pendingBills?.length && !guest.pendingOrders?.length && (
                      <p className="text-[11px] italic text-brand-muted text-center py-1">Direct Adjustment / Manual Due</p>
                    )}
                  </div>

                  <button 
                    onClick={() => openPayment(guest)}
                    className="btn-primary w-full mt-6 !h-12 flex items-center justify-center gap-2.5 text-[14px] font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-95 transition-all"
                  >
                    <FontAwesomeIcon icon={faMoneyBillWave} /> Clear Due
                  </button>
               </div>
            </div>
          ))}
          {filteredGuests.length === 0 && (
            <div className="col-span-full py-24 text-center">
                <div className="inline-grid h-20 w-20 place-content-center rounded-full bg-slate-100 text-slate-300 mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-slate-400">All guest dues are cleared</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <Modal open={!!activeGuest} title="Process Due Payment" onClose={() => !submitting && setActiveGuest(null)} width="440px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-bold text-brand-muted uppercase tracking-widest">Processing Payment...</p>
            </div>
          )}
          <form className={`space-y-6 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={handlePayment}>
            <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 text-center">
                <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                <p className="text-[32px] font-black text-rose-600 tracking-tight">Rs. {activeGuest?.totalDue?.toLocaleString()}</p>
            </div>

            <div>
                <label className="label">Payment Amount (Rs.)</label>
                <div className="relative">
                    <FontAwesomeIcon icon={faReceipt} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/50" />
                    <input 
                        type="number" 
                        max={activeGuest?.totalDue}
                        className="input !pl-12 !h-[56px] text-[18px] font-black text-brand-blue border-brand-blue/20" 
                        value={paymentAmount} 
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        required
                    />
                </div>
                {Number(paymentAmount) < activeGuest?.totalDue && (
                    <p className="text-[11px] font-bold text-amber-600 mt-2 italic px-1">
                        * Remaining due after this payment: Rs. {(activeGuest.totalDue - Number(paymentAmount)).toLocaleString()}
                    </p>
                )}
            </div>

            <div>
                <label className="label">Payment Method</label>
                <select className="input font-bold" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {paymentMethods.map(m => <option key={m}>{m}</option>)}
                </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-brand-border">
                <button type="button" className="btn-secondary flex-1 !h-12 uppercase font-black text-[12px] tracking-widest" onClick={() => setActiveGuest(null)}>Cancel</button>
                <button type="submit" className="btn-primary flex-[2] !h-12 uppercase font-black text-[12px] tracking-widest">Confirm Payment</button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
