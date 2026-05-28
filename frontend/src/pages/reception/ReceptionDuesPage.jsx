import { useEffect, useState, useMemo } from 'react';
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
  const [filterType, setFilterType] = useState('All');
  
  // Payment Modal State
  const [activeGuest, setActiveGuest] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const loadData = async () => {
    if (guests.length === 0) setLoading(true);
    try {
      // Add 1s delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const [allGuests, allBills] = await Promise.all([
        api.fetchList('/guests'),
        api.fetchList('/bills')
      ]);

      // Master Map to aggregate everything by guest
      // Key: normalized name+phone
      const duesMap = new Map();

      const normKey = (name, phone) => `${(name || '').toLowerCase().trim()}_${(phone || '').trim()}`;

      // 1. Add all guests who have a profile totalDue
      allGuests.forEach(g => {
        if ((g.totalDue || 0) > 0) {
          const key = normKey(g.name, g.phone);
          if (duesMap.has(key)) {
            const existing = duesMap.get(key);
            existing.totalDue += g.totalDue;
            existing.guestProfiles.push(g);
            // Keep Checked In status if any profile has it
            if (g.status === 'Checked In') {
              existing.status = 'Checked In';
            }
          } else {
            duesMap.set(key, {
              _id: g._id, // Hold primary ID
              name: g.name,
              phone: g.phone,
              status: g.status,
              totalDue: g.totalDue,
              checkInDate: g.checkInDate,
              createdAt: g.createdAt,
              guestProfiles: [g],
              pendingBills: [],
              pendingOrders: []
            });
          }
        }
      });

      // Helper: resolve the map key for a record that may or may not have a guestId
      const resolveKey = (guestId, guestName, phone) => {
        if (guestId) {
          const id = guestId?._id?.toString() || guestId?.toString();
          const g = allGuests.find(x => x._id.toString() === id);
          if (g) return normKey(g.name, g.phone);
        }
        return normKey(guestName, phone);
      };

      // 2. Add/Update from Bills
      allBills.forEach(b => {
        if ((b.totalDue || 0) > 0) {
          const key = resolveKey(b.guestId, b.guestName, b.contactNo);
          if (duesMap.has(key)) {
            const existing = duesMap.get(key);
            if (!existing.pendingBills.find(pb => pb._id === b._id)) {
              existing.pendingBills.push(b);
            }
          } else {
            const entry = {
              _id: b.guestId || `bill-name-${key}`,
              name: b.guestName || 'Unknown Guest',
              phone: b.contactNo,
              status: 'Bill Pending',
              totalDue: b.totalDue,
              checkInDate: b.checkIn,
              createdAt: b.createdAt,
              guestProfiles: [],
              pendingBills: [b],
              pendingOrders: []
            };
            duesMap.set(key, entry);
          }
        }
      });

      // 4. Convert map back to array and ensure totalDue reflects the breakdown accurately
      const processedGuests = Array.from(duesMap.values()).map(g => {
        const billTotal = g.pendingBills.reduce((sum, b) => sum + (Number(b.totalDue) || 0), 0);
        
        let finalTotal = billTotal;

        // Adjust status if checked in
        let finalStatus = g.status;
        const statuses = (g.guestProfiles || []).map(p => p.status);
        if (statuses.includes('Checked In')) {
          finalStatus = 'Checked In';
        }

        return { ...g, totalDue: finalTotal, status: finalStatus };
      }).filter(g => {
        const name = g.name?.toLowerCase() || '';
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

  const displayedGuests = useMemo(() => {
    return guests
      .map(g => {
        // Calculate Room Dues breakdown and totals
        const roomBills = g.pendingBills || [];
        const billTotal = roomBills.reduce((sum, b) => sum + (Number(b.totalDue) || 0), 0);

        // Determine which fields are displayed and what the total due is
        let finalDue = g.totalDue;
        let finalBills = g.pendingBills;

        if (filterType === 'Room') {
          finalDue = billTotal;
          finalBills = roomBills;
        } else if (filterType === 'Restaurant') {
          finalDue = 0;
          finalBills = [];
        }

        return {
          ...g,
          totalDue: finalDue,
          pendingBills: finalBills,
          guestProfiles: g.guestProfiles
        };
      })
      .filter(g => {
        // If the total due under this filter is 0 or less, hide this guest
        if (g.totalDue <= 0) return false;

        // Apply search filter
        const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || 
                              g.phone?.includes(search);
        return matchesSearch;
      });
  }, [guests, filterType, search]);

  const totalDues = useMemo(() => {
    return displayedGuests.reduce((sum, g) => sum + (Number(g.totalDue) || 0), 0);
  }, [displayedGuests]);

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
      
      // 1. Update Guest Dues (Sequentially deduct from matching guest profiles)
      if (activeGuest.guestProfiles && activeGuest.guestProfiles.length > 0) {
        let remainingGuestDuePay = amountToPay;
        for (const gp of activeGuest.guestProfiles) {
          if (remainingGuestDuePay <= 0) break;
          const gpDue = gp.totalDue || 0;
          if (gpDue > 0) {
            const paymentForThisProfile = Math.min(gpDue, remainingGuestDuePay);
            const newGpDue = Math.max(0, gpDue - paymentForThisProfile);
            await api.updateItem('/guests', gp._id, {
              totalDue: newGpDue
            });
            remainingGuestDuePay -= paymentForThisProfile;
          }
        }
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
      const activeNp = normKey(activeGuest.name, activeGuest.phone);
      const guestBills = allBills
        .filter(b => {
          if ((b.totalDue || 0) <= 0) return false;
          const bGuestId = (b.guestId?._id || b.guestId || '').toString();
          if (bGuestId && activeGuest.guestProfiles?.some(gp => gp._id.toString() === bGuestId)) return true;
          return normKey(b.guestName, b.contactNo) === activeNp;
        })
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

      notifySuccess(`Payment of Rs. ${amountToPay.toLocaleString()} received and applied to bills`);
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
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5 border-l-4 border-l-rose-500 shadow-sm md:col-span-1 flex flex-col justify-center bg-gradient-to-br from-white to-rose-50/10">
          <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Total Dues to be Collected</p>
          <h3 className="mt-2 text-[26px] font-black text-rose-600 tracking-tight">Rs. {totalDues.toLocaleString()}</h3>
        </div>
        <div className="card p-5 border-l-4 border-l-brand-blue shadow-sm md:col-span-2 flex flex-col justify-center">
          <label className="text-[12px] font-bold uppercase tracking-wider text-brand-muted mb-2 block">Search Guest</label>
          <div className="relative w-full">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input className="input !pl-11 !h-11 font-semibold w-full" placeholder="Search by guest name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedGuests.map((guest) => (
            <div key={guest._id} className="card group overflow-hidden transition-all hover:shadow-lg border-rose-100 bg-gradient-to-br from-white to-rose-50/20 flex flex-col h-full">
               <div className="p-6 flex flex-col h-full">
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
                  <div className="mt-4 pt-3 border-t border-dashed border-brand-border space-y-2 flex-1 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent">
                    <p className="text-[10px] font-black uppercase text-brand-muted mb-2">Source of Due</p>

                    {guest.pendingBills?.map(bill => (
                      <div key={bill._id} className="flex flex-col bg-slate-50 p-3 rounded-lg text-[11px] font-bold border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center w-full mb-2">
                          <span className="text-slate-800 text-[12px]">Bill No: {bill.billNo}</span>
                          <span className="text-rose-600 text-[12px]">Rs. {bill.totalDue?.toLocaleString()}</span>
                        </div>
                        
                        {(bill.rooms?.length > 0 || bill.roomNo) && (
                           <div className="mt-1">
                              <div className="grid grid-cols-4 gap-1 border-b border-slate-200 pb-1 mb-1 text-slate-500 text-[9px] uppercase tracking-wider">
                                 <div className="col-span-2">Room</div>
                                 <div className="text-right">Price</div>
                                 <div className="text-right">Total</div>
                              </div>
                              {bill.rooms?.length > 0 ? (
                                bill.rooms.map((r, i) => (
                                  <div key={i} className="grid grid-cols-4 gap-1 text-[10px] font-medium text-slate-700 py-0.5">
                                    <div className="col-span-2 truncate pr-1">Rm: {r.roomNo}</div>
                                    <div className="text-right">{r.price?.toLocaleString()}</div>
                                    <div className="text-right">{r.total?.toLocaleString()}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="grid grid-cols-4 gap-1 text-[10px] font-medium text-slate-700 py-0.5">
                                  <div className="col-span-4 truncate">Rm: {bill.roomNo}</div>
                                </div>
                              )}
                           </div>
                        )}

                        {bill.restaurantItems?.length > 0 && (
                           <div className="mt-2">
                              <div className="grid grid-cols-5 gap-1 border-b border-slate-200 pb-1 mb-1 text-slate-500 text-[9px] uppercase tracking-wider">
                                 <div className="col-span-2">Items</div>
                                 <div className="text-right">Qty</div>
                                 <div className="text-right">Price</div>
                                 <div className="text-right">Total</div>
                              </div>
                              {bill.restaurantItems.map((item, i) => (
                                <div key={i} className="grid grid-cols-5 gap-1 text-[10px] font-medium text-slate-700 py-0.5">
                                  <div className="col-span-2 truncate pr-1" title={item.item}>
                                    {item.item.replace(/^Rest\. Order #[A-Za-z0-9]+ - /, '')}
                                  </div>
                                  <div className="text-right">{item.qty}</div>
                                  <div className="text-right">{item.price?.toLocaleString()}</div>
                                  <div className="text-right">{item.total?.toLocaleString()}</div>
                                </div>
                              ))}
                           </div>
                        )}
                      </div>
                    ))}

                    {!guest.pendingBills?.length && (
                      <p className="text-[11px] italic text-brand-muted text-center py-1">Direct Adjustment / Manual Due</p>
                    )}
                  </div>

                  <button 
                    onClick={() => openPayment(guest)}
                    className="btn-primary w-full mt-6 !h-12 flex items-center justify-center gap-2.5 text-[14px] font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-95 transition-all mt-auto shrink-0"
                  >
                    <FontAwesomeIcon icon={faMoneyBillWave} /> Clear Due
                  </button>
               </div>
            </div>
          ))}
          {displayedGuests.length === 0 && (
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
      <Modal open={!!activeGuest} title="Process Due Payment" onClose={() => !submitting && setActiveGuest(null)} width="480px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-bold text-brand-muted uppercase tracking-widest">Processing Payment...</p>
            </div>
          )}
          <form className={`space-y-5 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={handlePayment}>
            {/* Guest summary */}
            <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 text-center">
                <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-1">Guest: {activeGuest?.name}</p>
                <p className="text-[11px] font-bold text-rose-400 mb-2">Total Outstanding</p>
                <p className="text-[32px] font-black text-rose-600 tracking-tight">Rs. {activeGuest?.totalDue?.toLocaleString()}</p>
            </div>

            {/* Itemized breakdown */}
            {(activeGuest?.pendingBills?.length > 0) && (
              <div className="rounded-xl border border-dashed border-brand-border bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-3">Due Breakdown</p>
                <div className="space-y-2">
                  {activeGuest?.pendingBills?.map(bill => (
                    <div key={bill._id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-[14px] font-black text-slate-800">Bill No: {bill.billNo} <span className="text-[11px] text-brand-muted font-normal">({bill.guestName})</span></p>
                          {bill.checkIn && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Stay: {new Date(bill.checkIn).toLocaleDateString()} → {bill.checkOut ? new Date(bill.checkOut).toLocaleDateString() : 'Active'}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-black text-rose-600 text-[15px]">Rs. {bill.totalDue?.toLocaleString()}</span>
                      </div>
                      
                      {(bill.rooms?.length > 0 || bill.roomNo) && (
                         <div className="mb-3">
                            <div className="grid grid-cols-4 gap-2 border-b border-slate-100 pb-1.5 mb-1.5 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                               <div className="col-span-2">Room</div>
                               <div className="text-right">Price</div>
                               <div className="text-right">Total</div>
                            </div>
                            {bill.rooms?.length > 0 ? (
                              bill.rooms.map((r, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 text-[11px] font-medium text-slate-700 py-1">
                                  <div className="col-span-2 truncate pr-2">Rm: {r.roomNo}</div>
                                  <div className="text-right">{r.price?.toLocaleString()}</div>
                                  <div className="text-right">{r.total?.toLocaleString()}</div>
                                </div>
                              ))
                            ) : (
                              <div className="grid grid-cols-4 gap-2 text-[11px] font-medium text-slate-700 py-1">
                                <div className="col-span-4 truncate">Rm: {bill.roomNo}</div>
                              </div>
                            )}
                         </div>
                      )}

                      {bill.restaurantItems?.length > 0 && (
                         <div>
                            <div className="grid grid-cols-5 gap-2 border-b border-slate-100 pb-1.5 mb-1.5 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                               <div className="col-span-2">Items</div>
                               <div className="text-right">Qty</div>
                               <div className="text-right">Price</div>
                               <div className="text-right">Total</div>
                            </div>
                            {bill.restaurantItems.map((item, i) => (
                              <div key={i} className="grid grid-cols-5 gap-2 text-[11px] font-medium text-slate-700 py-1 hover:bg-slate-50 rounded">
                                <div className="col-span-2 truncate pr-2" title={item.item}>
                                  {item.item.replace(/^Rest\. Order #[A-Za-z0-9]+ - /, '')}
                                </div>
                                <div className="text-right">{item.qty}</div>
                                <div className="text-right">{item.price?.toLocaleString()}</div>
                                <div className="text-right">{item.total?.toLocaleString()}</div>
                              </div>
                            ))}
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                {Number(paymentAmount) < activeGuest?.totalDue && Number(paymentAmount) > 0 && (
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
