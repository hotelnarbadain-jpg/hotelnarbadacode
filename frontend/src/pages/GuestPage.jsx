import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPen, faPhone, faPlus, faTrash, faUser } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { CardSkeleton } from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

const guestDefaults = { name: '', phone: '', city: '', roomNo: '', checkInDate: '', checkInTime: '', status: 'Checked In' };

export default function GuestPage({ api, updateTrigger }) {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState(guestDefaults);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

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
      if (!existing || g.status === 'Checked In' || new Date(g.checkInDate) > new Date(existing.checkInDate)) {
        uniqueMap.set(key, g);
      }
    });
    const uniqueGuests = Array.from(uniqueMap.values());

    // 2. Filter by search query
    const query = search.toLowerCase();
    return uniqueGuests.filter((guest) =>
      [guest.name, guest.phone, guest.city, guest.roomNo].some((value) => (value || '').toLowerCase().includes(query))
    );
  }, [guests, search]);

  const openCreate = () => { setEditing(null); setForm(guestDefaults); setModalOpen(true); };
  const openEdit = (guest) => { setEditing(guest); setForm({ ...guest, checkInDate: guest.checkInDate?.slice(0, 10) || '', checkInTime: guest.checkInTime || '12:00' }); setModalOpen(true); };

  const submit = (event) => {
    event.preventDefault();
    if (form.phone && form.phone.length !== 10) return notifyError('Contact number must be 10 digits');
    setShowConfirmSubmit(true);
  };

  const handleActualSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    try {
      if (editing) {
        await api.updateItem('/guests', editing._id, form);
        notifySuccess('Guest updated successfully');
      } else {
        await api.createItem('/guests', form);
        notifySuccess('Guest added successfully');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      // Error handled by api
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    try {
      await api.deleteItem('/guests', confirmDelete._id);
      notifySuccess('Guest deleted successfully');
      setConfirmDelete(null);
      load();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Guest Management"
        subtitle="Checked-in Guests Record"
        actions={
          <>
            <input className="input w-full sm:w-80" placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn-primary" onClick={openCreate}><FontAwesomeIcon icon={faPlus} /> Add Guest</button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((guest) => (
            <div key={guest._id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-10 w-10 place-content-center rounded-md bg-slate-100 text-brand-muted">
                  <FontAwesomeIcon icon={faUser} />
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary !h-9 !px-3" onClick={() => openEdit(guest)}><FontAwesomeIcon icon={faPen} /></button>
                  <button className="btn-danger !h-9" onClick={() => setConfirmDelete(guest)}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </div>
              <h3 className="mt-4 text-[18px] font-bold uppercase">{guest.name}</h3>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brand-muted">Guest Profile</p>
                {guests.filter(g => g.name === guest.name && g.phone === guest.phone).length > 1 && (
                  <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-brand-blue uppercase">Returning</span>
                )}
                {guest.deletionStatus === 'Requested' && (
                  <span className="text-[8px] bg-amber-100 px-1.5 py-0.5 rounded font-black text-amber-700 uppercase">Pending Deletion</span>
                )}
              </div>
              <div className="mt-5 space-y-3 text-[13px]">
                <p><FontAwesomeIcon icon={faPhone} className="mr-2 text-brand-blue" />{guest.phone}</p>
                <p><FontAwesomeIcon icon={faLocationDot} className="mr-2 text-brand-blue" />{guest.city}</p>
              </div>

              {(guest.computedDue || 0) > 0 && (
                <div className="mt-4 flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Balance Due</span>
                  <span className="text-[15px] font-black text-rose-600 tracking-tight">Rs. {guest.computedDue.toLocaleString()}</span>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted">No guests found.</div>}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Update Guest' : 'Add Guest'} onClose={() => !submitting && setModalOpen(false)} width="560px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editing ? 'Updating guest...' : 'Adding guest...'}
              </p>
            </div>
          )}
          <form className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${(submitting || showConfirmSubmit) ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={submit}>
            <div className="md:col-span-2"><label className="label">Full Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div>
              <label className="label">Contact No</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {form.phone && form.phone.length !== 10 && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
              )}
            </div>
            <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="md:col-span-2">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Checked In</option>
                <option>Checked Out</option>
              </select>
            </div>
            <div className="md:col-span-2 mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editing ? 'Update Guest' : 'Save Guest'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Delete ${confirmDelete?.name}?`} onClose={() => setConfirmDelete(null)} onConfirm={remove} />

      <ConfirmDialog
        open={showConfirmSubmit}
        title="Confirm Guest Save"
        message={`Are you sure you want to ${editing ? 'update' : 'add'} guest ${form.name}?`}
        confirmText={editing ? 'Update Guest' : 'Add Guest'}
        confirmClass="btn-primary"
        onClose={() => setShowConfirmSubmit(false)}
        onConfirm={handleActualSubmit}
      />
    </div>
  );
}
