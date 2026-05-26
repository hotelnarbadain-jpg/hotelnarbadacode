import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPen, faPhone, faPlus, faTrash, faUser, faSearch, faBed, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { CardSkeleton } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

const guestDefaults = { name: '', phone: '', city: '', noOfGuest: 1, documentType: 'Citizenship', documentNo: '', remarks: '', roomNo: '', price: '', checkInDate: '', checkInTime: '', status: 'Checked In' };

export default function ReceptionGuestPage({ api, updateTrigger }) {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(guestDefaults);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (guests.length === 0) setLoading(true);
    try {
        const [guestRes, billRes, orderRes] = await Promise.all([
          api.fetchList('/guests'),
          api.fetchList('/bills'),
          api.fetchList('/restaurant-orders')
        ]);

        const processedGuests = guestRes.map(g => {
          const pendingBills = billRes.filter(b => (b.guestId?._id || b.guestId) === g._id && (b.totalDue || 0) > 0);
          const pendingOrders = orderRes.filter(o => (o.guestId?._id || o.guestId) === g._id && o.paymentMethod === 'Credit' && o.status === 'Completed');
          
          const billTotal = pendingBills.reduce((sum, b) => sum + (Number(b.totalDue) || 0), 0);
          const orderTotal = pendingOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
          
          let computedDue = billTotal + orderTotal;
          if (g.status === 'Checked In' && (g.totalDue || 0) > computedDue) {
              computedDue = g.totalDue;
          }
          
          return { ...g, computedDue };
        });

        setGuests(processedGuests);
    } catch (err) {
        console.error('Failed to load guests', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [updateTrigger]);

  const filtered = useMemo(() => {
    // 1. Deduplicate by Name + Phone
    const uniqueMap = new Map();
    guests.forEach((g) => {
      const key = `${(g.name || '').toLowerCase()}_${(g.phone || '').trim()}`;
      const existing = uniqueMap.get(key);
      // Preference: Current 'Checked In' stays, or otherwise the one with the latest date
      if (!existing || g.status === 'Checked In' || new Date(g.checkInDate) > new Date(existing.checkInDate)) {
        uniqueMap.set(key, g);
      }
    });
    const uniqueGuests = Array.from(uniqueMap.values());

    // 2. Filter by search query
    const query = search.toLowerCase();
    return uniqueGuests.filter((guest) =>
      [
        guest.name, 
        guest.phone, 
        guest.city, 
        guest.roomNo, 
        ...(guest.rooms || []).map(r => r.roomNo)
      ].some((value) => (value || '').toLowerCase().includes(query))
    );
  }, [guests, search]);

  const openEdit = (guest) => { 
    setEditing(guest); 
    setForm({ 
        ...guest, 
        checkInDate: guest.checkInDate?.slice(0, 10) || '',
        checkInTime: guest.checkInTime || '12:00',
        price: guest.price || '',
        noOfGuest: guest.noOfGuest || 1
    }); 
    setModalOpen(true); 
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.phone && form.phone.length !== 10) return notifyError('Contact number must be 10 digits');
    setSubmitting(true);
    try {
        if (editing) {
            await api.updateItem('/guests', editing._id, {
                ...form,
                noOfGuest: Number(form.noOfGuest),
                price: Number(form.price)
            });
            notifySuccess('Guest profile updated successfully');
        }
        setModalOpen(false);
        load();
    } catch (err) {
        console.error('Update failed', err);
    }
    setSubmitting(false);
  };

  const remove = async () => {
    setSubmitting(true);
    try {
        const response = await api.deleteItem('/guests', confirmDelete._id);
        // The message will be either "Guest deleted successfully" (Admin) 
        // or "Action has been sent to the admin" (Reception)
        notifySuccess(response.message || 'Action completed');
        setConfirmDelete(null);
        load();
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
        title="Guest Directory"
        subtitle="Manage Detailed Guest Profiles & Check-in Status"
        actions={
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
                className="input !pl-11" 
                placeholder="Search by Name, Phone, Room..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((guest) => (
            <div key={guest._id} className="card overflow-hidden transition-all hover:shadow-md">
              <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="grid h-12 w-12 place-content-center rounded-2xl bg-slate-100 text-brand-muted">
                        <FontAwesomeIcon icon={faUser} className="text-[20px]" />
                    </div>
                    <div className="flex gap-2">
                        <button className="btn-secondary !h-9 !px-3" onClick={() => openEdit(guest)}><FontAwesomeIcon icon={faPen} /></button>
                        <button 
                          className={`btn-danger !h-9 ${guest.deletionStatus === 'Requested' ? 'opacity-50 pointer-events-none' : ''}`} 
                          onClick={() => setConfirmDelete(guest)}
                          disabled={guest.deletionStatus === 'Requested'}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[18px] font-black text-slate-800 uppercase leading-none">{guest.name}</h3>
                        {guest.status === 'Checked In' ? 
                           <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 text-[14px]" /> :
                           <FontAwesomeIcon icon={faCircleXmark} className="text-slate-300 text-[14px]" />
                        }
                    </div>
                    {guest.deletionStatus === 'Requested' && (
                       <div className="mb-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
                          Pending Approval
                       </div>
                    )}
                    <p className="text-[11px] font-black uppercase tracking-widest text-brand-muted">Guest ID: {guest._id.slice(-6).toUpperCase()}</p>
                    {(guest.computedDue || 0) > 0 && (
                      <div className="mt-2 flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Balance Due</span>
                        <span className="text-[15px] font-black text-rose-600 tracking-tight">Rs. {guest.computedDue.toLocaleString()}</span>
                      </div>
                    )}
                    {guests.filter(g => g.name === guest.name && g.phone === guest.phone).length > 1 && (
                      <span className="mt-1 inline-block text-[9px] bg-blue-50 text-brand-blue px-2 py-0.5 rounded-full font-black uppercase ring-1 ring-blue-100">Returning Guest</span>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-brand-border pt-5">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">Contact</p>
                        <p className="text-[13px] font-bold text-slate-700"><FontAwesomeIcon icon={faPhone} className="mr-2 text-brand-blue" />{guest.phone || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">Address</p>
                        <p className="text-[13px] font-bold text-slate-700"><FontAwesomeIcon icon={faLocationDot} className="mr-2 text-brand-blue" />{guest.city || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">Status</p>
                        <span className={`text-[12px] font-black uppercase ${guest.status === 'Checked In' ? 'text-green-600' : 'text-slate-500'}`}>
                            {guest.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">Current Room</p>
                        <p className="text-[13px] font-bold text-slate-800 uppercase">
                            <FontAwesomeIcon icon={faBed} className="mr-2 text-brand-blue" />
                            {guest.rooms?.length > 1 ? guest.rooms.map(r => r.roomNo).join(', ') : (guest.roomNo || 'None')}
                        </p>
                    </div>
                </div>

                {guest.remarks && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 italic text-[12px] text-slate-500 border border-slate-100">
                        "{guest.remarks}"
                    </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted font-bold uppercase tracking-widest font-black">No guests found.</div>}
        </div>
      )}

      {/* Edit Guest Modal */}
      <Modal open={modalOpen} title="Update Guest Profile" onClose={() => !submitting && setModalOpen(false)} width="600px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">Updating guest...</p>
            </div>
          )}
          <form className={`grid gap-4 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={submit}>
            <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div>
              <label className="label">Contact No</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {form.phone && form.phone.length !== 10 && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
              )}
            </div>
            <div className="md:col-span-2"><label className="label">Address</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            
            <div className="grid grid-cols-2 gap-4 md:col-span-2 border-t border-brand-border pt-4">
                <div><label className="label">Doc Type</label><select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                    <option>Citizenship</option>
                    <option>License</option>
                    <option>National ID</option>
                    <option>Passport</option>
                </select></div>
                <div><label className="label">Doc Number</label><input className="input" value={form.documentNo} onChange={(e) => setForm({ ...form, documentNo: e.target.value })} /></div>
            </div>

            <div className="md:col-span-2 mt-2 flex justify-end gap-3 border-t border-brand-border pt-4">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Permanently delete profile for ${confirmDelete?.name}?`} onClose={() => setConfirmDelete(null)} onConfirm={remove} />
    </div>
  );
}
