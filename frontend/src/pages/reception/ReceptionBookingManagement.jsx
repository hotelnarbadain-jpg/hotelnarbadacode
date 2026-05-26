import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faPen, faPlus, faTrash, faSearch, faUser, faAddressCard, faIdCard, faUsers, faTag, faCommentDots, faCheckCircle, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CardSkeleton } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

const initialBookingForm = {
  name: '',
  phone: '',
  city: '',
  noOfGuest: 1,
  documentType: 'Citizenship',
  documentNo: '',
  remarks: '',
  rooms: [],
  roomNo: '',
  price: '',
  advancePayment: '',
  checkInDate: '',
  checkInTime: '',
  status: 'Checked In'
};

export default function ReceptionBookingManagement({ api, updateTrigger }) {
  const [bookings, setBookings] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(initialBookingForm);
  
  // Fast Search states
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const loadData = async () => {
    if (bookings.length === 0 || rooms.length === 0) setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const [guestRows, roomRows] = await Promise.all([
        api.fetchList('/guests'),
        api.fetchList('/rooms'),
      ]);
      setAllGuests(guestRows);
      setBookings(guestRows.filter(g => g.status === 'Checked In'));
      setRooms(roomRows);
    } catch (err) {
      notifyError('Failed to load booking data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [updateTrigger]);

  const filteredBookings = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => 
      b.name.toLowerCase().includes(q) || 
      b.roomNo?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const availableRooms = useMemo(() => {
    return rooms.filter(r => r.status === 'Available' || (editingBooking && (editingBooking.rooms || []).some(er => er.roomNo === r.roomNo)));
  }, [rooms, editingBooking]);

  const suggestedGuests = useMemo(() => {
    if (!guestSearchQuery) return [];
    const matches = allGuests.filter(g => 
        g.name.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
        g.phone?.includes(guestSearchQuery)
    );

    const uniqueMatches = [];
    const seen = new Set();
    for (const guest of matches) {
        const identifier = guest.documentNo || guest.phone || guest.name.toLowerCase();
        if (!seen.has(identifier)) {
            seen.add(identifier);
            uniqueMatches.push(guest);
        }
        if (uniqueMatches.length >= 5) break;
    }
    return uniqueMatches;
  }, [guestSearchQuery, allGuests]);

  const selectSuggestedGuest = (guest) => {
    setForm({
      ...form,
      name: guest.name,
      phone: guest.phone || '',
      city: guest.city || '',
      documentType: guest.documentType || 'Citizenship',
      documentNo: guest.documentNo || '',
    });
    setGuestSearchQuery('');
    setShowGuestDropdown(false);
  };

  const selectAllRooms = () => {
    const newRooms = [...form.rooms];
    availableRooms.forEach(room => {
      if (!newRooms.some(r => r.roomNo === room.roomNo)) {
        newRooms.push({ roomNo: room.roomNo, noOfGuest: 1, price: room.rate });
      }
    });
    setForm({ ...form, rooms: newRooms });
  };

  const deselectAllRooms = () => {
    const availableRoomNos = availableRooms.map(r => r.roomNo);
    setForm({ ...form, rooms: form.rooms.filter(r => !availableRoomNos.includes(r.roomNo)) });
  };

  const toggleRoomSelection = (room) => {
    const isSelected = form.rooms.some(r => r.roomNo === room.roomNo);
    if (isSelected) {
      setForm({ ...form, rooms: form.rooms.filter(r => r.roomNo !== room.roomNo) });
    } else {
      setForm({ ...form, rooms: [...form.rooms, { roomNo: room.roomNo, noOfGuest: 1, price: room.rate }] });
    }
  };

  const updateRoomData = (roomNo, field, value) => {
    setForm({
      ...form,
      rooms: form.rooms.map(r => r.roomNo === roomNo ? { ...r, [field]: value } : r)
    });
  };

  const openCreate = () => {
    setEditingBooking(null);
    const now = new Date();
    setForm({ 
      ...initialBookingForm, 
      checkInDate: now.toISOString().slice(0, 10),
      checkInTime: now.toTimeString().slice(0, 5) 
    });
    setGuestSearchQuery('');
    loadData(); // Ensure fresh guest list for fast-booking
    setModalOpen(true);
  };

  const openEdit = (booking) => {
    setEditingBooking(booking);
    setForm({ 
      ...booking, 
      rooms: booking.rooms?.length > 0 ? booking.rooms : [{ roomNo: booking.roomNo, noOfGuest: booking.noOfGuest, price: booking.price }],
      checkInDate: booking.checkInDate?.slice(0, 10) || '',
      checkInTime: booking.checkInTime || '12:00'
    });
    setGuestSearchQuery('');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) return notifyError('Contact number must be 10 digits');
    if (form.rooms.length === 0) {
        notifyError('Please select at least one room');
        return;
    }
    setShowConfirmSubmit(true);
  };

  const handleActualSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    try {
      const payload = {
          ...form,
          roomNo: form.rooms.map(r => r.roomNo).filter(rn => rn).join(', '),
          noOfGuest: Number(form.noOfGuest),
          price: form.rooms.reduce((sum, r) => sum + Number(r.price || 0), 0)
      };

      if (editingBooking) {
        // Handle room status updates
        const oldRoomNos = (editingBooking.rooms || [{ roomNo: editingBooking.roomNo }]).map(r => r.roomNo);
        const newRoomNos = form.rooms.map(r => r.roomNo);

        // Rooms to free (old but not in new list)
        const toFree = oldRoomNos.filter(rn => !newRoomNos.includes(rn));
        for (const rn of toFree) {
            const roomObj = rooms.find(r => r.roomNo === rn);
            if (roomObj) await api.updateItem('/rooms', roomObj._id, { status: 'Dirty' });
        }

        // Rooms to occupy (new but not in old list)
        const toOccupy = newRoomNos.filter(rn => !oldRoomNos.includes(rn));
        for (const rn of toOccupy) {
            const roomObj = rooms.find(r => r.roomNo === rn);
            if (roomObj) await api.updateItem('/rooms', roomObj._id, { status: 'Occupied' });
        }

        await api.updateItem('/guests', editingBooking._id, payload);
        
        const advanceDiff = Number(payload.advancePayment || 0) - Number(editingBooking.advancePayment || 0);
        if (advanceDiff > 0) {
            await api.createItem('/financials', { 
                title: `Additional Advance - Room ${payload.roomNo} (${payload.name})`, 
                amount: advanceDiff, 
                type: 'Income', 
                date: new Date() 
            });
        }

        notifySuccess('Booking updated');
      } else {
        await api.createItem('/guests', payload);
        
        if (Number(payload.advancePayment || 0) > 0) {
            await api.createItem('/financials', { 
                title: `Advance Payment - Room ${payload.roomNo} (${payload.name})`, 
                amount: Number(payload.advancePayment), 
                type: 'Income', 
                date: new Date() 
            });
        }

        // Occupy all rooms
        for (const r of form.rooms) {
            const roomObj = rooms.find(ro => ro.roomNo === r.roomNo);
            if (roomObj) await api.updateItem('/rooms', roomObj._id, { status: 'Occupied' });
        }
        notifySuccess('Guest checked in successfully');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      notifyError('Failed to process booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      if (confirmDelete.status === 'Checked In') {
        const guestRooms = confirmDelete.rooms || [{ roomNo: confirmDelete.roomNo }];
        for (const gr of guestRooms) {
            const room = rooms.find(r => r.roomNo === gr.roomNo);
            if (room) await api.updateItem('/rooms', room._id, { status: 'Dirty' });
        }
      }
      await api.deleteItem('/guests', confirmDelete._id);
      notifySuccess('Booking deleted');
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Delete failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-[400px]">
      {/* Deletion / Global Loading Overlay */}
      {submitting && !modalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]">
          <div className="spinner"></div>
          <p className="text-[13px] font-black uppercase tracking-widest text-brand-muted">Processing Request...</p>
        </div>
      )}

      <PageHeader
        title="Booking Management"
        subtitle="Manage Live Hotel Occupancy & Guest Check-ins"
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-80">
                <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input className="input !pl-11" placeholder="Search live bookings..." value={search} onChange={(e) => setSearch(e.target.value)} />
             </div>
             <button className="btn-primary !h-12 !px-6" onClick={openCreate}><FontAwesomeIcon icon={faPlus} /> New Booking</button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => (
            <div key={booking._id} className="card group overflow-hidden transition-all hover:shadow-lg">
               <div className="flex items-center justify-between bg-slate-50 border-b border-brand-border px-6 py-4">
                  <div className="flex items-center gap-3">
                     <div className="grid h-10 w-10 place-content-center rounded-xl bg-brand-blue text-white font-black">
                        {booking.roomNo}
                     </div>
                     <p className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
                        {booking.rooms?.length > 1 ? `Rooms: ${booking.rooms.map(r => r.roomNo).join(', ')}` : `Room ${booking.roomNo}`}
                     </p>
                  </div>
                  <div className="flex gap-2">
                     <button className="h-8 w-8 grid place-content-center rounded bg-white border border-brand-border text-brand-blue hover:bg-brand-blue hover:text-white transition" onClick={() => openEdit(booking)}><FontAwesomeIcon icon={faPen} className="text-[12px]" /></button>
                     <button className="h-8 w-8 grid place-content-center rounded bg-white border border-brand-border text-rose-500 hover:bg-rose-500 hover:text-white transition" onClick={() => setConfirmDelete(booking)}><FontAwesomeIcon icon={faTrash} className="text-[12px]" /></button>
                  </div>
               </div>
               
               <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="grid h-12 w-12 place-content-center rounded-full bg-slate-100 text-brand-muted">
                        <FontAwesomeIcon icon={faUser} className="text-[20px]" />
                     </div>
                     <div>
                        <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{booking.name}</h3>
                        <p className="text-[11px] font-bold text-slate-500 tracking-wider"><FontAwesomeIcon icon={faUsers} className="mr-1" /> {booking.noOfGuest} GUESTS</p>
                     </div>
                  </div>

                  <div className="space-y-3 mt-6 border-t border-brand-border pt-5">
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted uppercase tracking-wider">Guests</span>
                        <span className="text-slate-700">{booking.noOfGuest} Persons</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted uppercase tracking-wider">DOC Type</span>
                        <span className="text-slate-700">{booking.documentType}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted uppercase tracking-wider">DOC Number</span>
                        <span className="text-slate-700">{booking.documentNo || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted uppercase tracking-wider">Check-in</span>
                        <span className="text-slate-700">{new Date(booking.checkInDate).toLocaleDateString()} | {booking.checkInTime}</span>
                    </div>
                    {booking.remarks && (
                      <div className="text-[12px] bg-slate-50 p-2 rounded-lg border border-slate-100 italic text-slate-500">
                        <FontAwesomeIcon icon={faCommentDots} className="mr-2" />
                        {booking.remarks}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[14px] font-black mt-2 pt-2 text-brand-blue border-t border-brand-border border-dashed">
                        <span>TOTAL PRICE</span>
                        <span>Rs. {booking.price?.toLocaleString()}</span>
                    </div>
                  </div>
               </div>
            </div>
          ))}
          {filteredBookings.length === 0 && (
            <div className="col-span-full py-20 text-center text-brand-muted font-black uppercase tracking-widest">
                No active bookings found.
            </div>
          )}
        </div>
      )}

      {/* BOOKING MODAL */}
      <Modal open={modalOpen} title={editingBooking ? "Update Booking" : "New Guest Check-in"} onClose={() => !submitting && setModalOpen(false)} width="720px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">Processing check-in...</p>
            </div>
          )}
          <form className={`grid gap-6 md:grid-cols-2 transition-all duration-200 ${(submitting || showConfirmSubmit) ? 'pointer-events-none blur-[2px]' : ''}`} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} onSubmit={handleSubmit}>
            
            {/* FAST SEARCH */}
            {!editingBooking && (
                <div className="md:col-span-2 relative">
                    <label className="label !text-brand-blue flex items-center gap-2"><FontAwesomeIcon icon={faSearch} /> Fast Booking (Search Existing Guest)</label>
                    <input 
                        className="input border-brand-blue/30 focus:border-brand-blue bg-blue-50/30" 
                        placeholder="Type guest name or phone to auto-fill..." 
                        value={guestSearchQuery}
                        onChange={(e) => { setGuestSearchQuery(e.target.value); setShowGuestDropdown(true); }}
                        onBlur={() => setTimeout(() => setShowGuestDropdown(false), 200)}
                    />
                    {showGuestDropdown && suggestedGuests.length > 0 && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-brand-border rounded-xl shadow-xl overflow-hidden">
                            {suggestedGuests.map(g => (
                                <button key={g._id} type="button" className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0" onClick={() => selectSuggestedGuest(g)}>
                                    <div className="h-8 w-8 grid place-content-center rounded-full bg-slate-100 text-slate-400 text-[12px]"><FontAwesomeIcon icon={faUser}/></div>
                                    <div className="text-left">
                                        <p className="text-[13px] font-black text-slate-800 uppercase">{g.name}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                            <span>{g.phone}</span>
                                            <span>•</span>
                                            <span>{g.city}</span>
                                            {g.documentNo && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-brand-blue">DOC: {g.documentNo}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="md:col-span-2 flex items-center gap-2 text-[14px] font-black uppercase tracking-tight text-slate-800 mb-[-10px]">
                <FontAwesomeIcon icon={faAddressCard} className="text-brand-blue" /> Guest Details
            </div>

            <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
            <div><label className="label">Permanent Address *</label><input className="input" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} required /></div>
            <div>
              <label className="label">Contact Number *</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required />
              {form.phone && form.phone.length !== 10 && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
              )}
            </div>
            <div><label className="label">No of Guest *</label><input className="input" type="number" min="1" value={form.noOfGuest} onChange={(e) => setForm({...form, noOfGuest: e.target.value})} required /></div>

            <div className="md:col-span-2 flex items-center gap-2 text-[14px] font-black uppercase tracking-tight text-slate-800 mb-[-10px] mt-2">
                <FontAwesomeIcon icon={faIdCard} className="text-brand-blue" /> Identification
            </div>

            <div>
                <label className="label">Document Type *</label>
                <select className="input" value={form.documentType} onChange={(e) => setForm({...form, documentType: e.target.value})} required>
                   <option>Citizenship</option>
                   <option>Driving Liscence</option>
                   <option>National Identity Card</option>
                   <option>Passport</option>
                </select>
            </div>
            <div><label className="label">Document Number *</label><input className="input" value={form.documentNo} onChange={(e) => setForm({...form, documentNo: e.target.value})} required /></div>
            <div className="md:col-span-2"><label className="label"><FontAwesomeIcon icon={faCommentDots} /> Remarks (Optional)</label><input className="input" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} /></div>

            <div className="md:col-span-2 flex items-center justify-between gap-2 text-[14px] font-black uppercase tracking-tight text-slate-800 mb-[-10px] mt-2 border-b border-brand-border pb-2">
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faBed} className="text-brand-blue" /> Room Assignment
                </div>
                <div className="flex gap-2">
                    {availableRooms.length > 0 && !availableRooms.every(ar => form.rooms.some(fr => fr.roomNo === ar.roomNo)) && (
                        <button type="button" className="text-[10px] bg-brand-soft text-brand-blue px-3 py-1.5 rounded-lg font-black uppercase hover:bg-brand-blue hover:text-white transition-all active:scale-95" onClick={selectAllRooms}>
                            <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" /> Select All
                        </button>
                    )}
                    {availableRooms.some(ar => form.rooms.some(fr => fr.roomNo === ar.roomNo)) && (
                        <button type="button" className="text-[10px] bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg font-black uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95" onClick={deselectAllRooms}>
                            <FontAwesomeIcon icon={faTimes} className="mr-1.5" /> Deselect All
                        </button>
                    )}
                </div>
            </div>

            <div className="md:col-span-2">
                <div className="border border-brand-border rounded-2xl overflow-hidden bg-white">
                    <div className="max-h-[280px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-[11px] font-black uppercase tracking-wider text-brand-muted border-b border-brand-border w-[200px]">Select Room</th>
                                    <th className="p-4 text-[11px] font-black uppercase tracking-wider text-brand-muted border-b border-brand-border">No of Guest</th>
                                    <th className="p-4 text-[11px] font-black uppercase tracking-wider text-brand-muted border-b border-brand-border">Price per Night</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableRooms.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-[12px] font-bold text-brand-muted uppercase tracking-widest italic">No Available Rooms Found</td>
                                    </tr>
                                ) : (
                                    availableRooms.map((room) => {
                                        const selectedRoom = form.rooms.find(r => r.roomNo === room.roomNo);
                                        const isSelected = !!selectedRoom;
                                        return (
                                            <tr key={room._id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/20' : ''}`}>
                                                <td className="p-4">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleRoomSelection(room)}
                                                        className={`flex items-center gap-3 w-full text-left group`}
                                                    >
                                                        <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-300 group-hover:border-brand-blue'}`}>
                                                            {isSelected && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[13px] font-black uppercase tracking-tight ${isSelected ? 'text-brand-blue' : 'text-slate-700'}`}>Room ({room.roomNo})</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{room.category}</span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        disabled={!isSelected}
                                                        className={`input !h-10 !text-[13px] font-black transition-all ${!isSelected ? 'opacity-30 bg-slate-100 cursor-not-allowed' : 'bg-white border-brand-blue/30'}`}
                                                        value={selectedRoom?.noOfGuest || ''}
                                                        onChange={(e) => updateRoomData(room.roomNo, 'noOfGuest', e.target.value)}
                                                        placeholder="Qty"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="relative">
                                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black transition-opacity ${!isSelected ? 'opacity-20' : 'text-brand-blue opacity-60'}`}>RS.</span>
                                                        <input 
                                                            type="number" 
                                                            disabled={!isSelected}
                                                            className={`input !h-10 !pl-9 !text-[13px] font-black transition-all ${!isSelected ? 'opacity-30 bg-slate-100 cursor-not-allowed' : 'bg-white border-brand-blue/30 text-brand-blue'}`}
                                                            value={selectedRoom?.price || ''}
                                                            onChange={(e) => updateRoomData(room.roomNo, 'price', e.target.value)}
                                                            placeholder="Price"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div>
                <label className="label">Check-in Date *</label>
                <input className="input" type="date" value={form.checkInDate} onChange={(e) => setForm({...form, checkInDate: e.target.value})} required />
            </div>

            <div>
                <label className="label">Check-in Time *</label>
                <input className="input" type="time" value={form.checkInTime} onChange={(e) => setForm({...form, checkInTime: e.target.value})} required />
            </div>

            <div className="md:col-span-2">
                <label className="label text-brand-blue">Advance Payment (Rs.)</label>
                <input className="input border-brand-blue/30 focus:border-brand-blue" type="number" min="0" placeholder="0" value={form.advancePayment} onChange={(e) => setForm({...form, advancePayment: e.target.value})} />
            </div>

            <div className="md:col-span-2 bg-brand-soft p-4 rounded-xl flex items-center justify-between border border-brand-blue/20">
                <span className="text-[13px] font-bold text-brand-blue uppercase tracking-wider">Estimated Total per Night</span>
                <span className="text-[18px] font-black text-brand-blue">
                    Rs. {form.rooms.reduce((sum, r) => sum + Number(r.price || 0), 0).toLocaleString()}
                </span>
            </div>

            <div className="md:col-span-2 mt-4 flex justify-end gap-3 pt-6 border-t border-brand-border">
              <button type="button" className="btn-secondary !h-12 !px-8" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary !h-12 !px-8" disabled={submitting}>
                <FontAwesomeIcon icon={faCheckCircle} /> {submitting ? 'Processing...' : editingBooking ? 'Update Booking' : 'Create Check-in'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Permanently delete active booking for Room ${confirmDelete?.roomNo}? This will free the room.`} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} />

      <ConfirmDialog 
        open={showConfirmSubmit} 
        title="Confirm Check-in"
        message={`Are you sure you want to ${editingBooking ? 'update' : 'create'} this booking for ${form.name}? This will mark ${form.rooms.length} room(s) as Occupied.`}
        onClose={() => setShowConfirmSubmit(false)} 
        onConfirm={handleActualSubmit} 
        confirmText={editingBooking ? "Confirm Update" : "Confirm Check-in"}
        confirmClass="btn-primary"
      />
    </div>
  );
}
