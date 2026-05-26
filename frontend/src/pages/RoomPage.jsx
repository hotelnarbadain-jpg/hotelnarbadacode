import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess } from '../utils/notify.jsx';

const RoomSkeleton = () => (
  <div className="card animate-pulse p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="h-12 w-12 rounded-full bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
      </div>
    </div>
    <div className="mt-4 h-6 w-1/2 rounded bg-slate-200" />
    <div className="mt-2 h-4 w-1/3 rounded bg-slate-100" />
    <div className="mt-4 space-y-2">
      <div className="h-4 w-2/3 rounded bg-slate-100" />
      <div className="h-4 w-1/2 rounded bg-slate-100" />
    </div>
    <div className="mt-4 h-6 w-24 rounded-full bg-slate-100" />
  </div>
);

const roomDefaults = { roomNo: '', category: '', rate: '', status: 'Available', floor: '' };
const categoryDefaults = { name: '', rate: '', description: '' };

export default function RoomPage({ api, updateTrigger }) {
  const [rooms, setRooms] = useState([]);
  const [roomCategories, setRoomCategories] = useState([]);
  const [tab, setTab] = useState('inventory');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [form, setForm] = useState(roomDefaults);
  const [categoryForm, setCategoryForm] = useState(categoryDefaults);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  const load = async () => {
    if (rooms.length === 0) setLoading(true);
    try {
      // Add 1s delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [roomRows, categoryRows] = await Promise.all([
        api.fetchList('/rooms'),
        api.fetchList('/room-categories'),
      ]);
      setRooms(roomRows);
      setRoomCategories(categoryRows);
    } catch (err) {
      console.error('Failed to load room data', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [updateTrigger]);

  const categories = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      const current = map.get(room.category) || { category: room.category, count: 0, rate: room.rate };
      current.count += 1;
      current.rate = room.rate;
      map.set(room.category, current);
    });
    return [...map.values()];
  }, [rooms]);

  const openCreate = () => {
    if (tab === 'inventory') {
      setEditingId(null);
      setForm(roomDefaults);
      setModalOpen(true);
    } else {
      setEditingCategoryId(null);
      setCategoryForm(categoryDefaults);
      setCategoryModalOpen(true);
    }
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({ ...row, rate: row.rate || '', floor: row.floor || '' });
    setModalOpen(true);
  };

  const openCategoryEdit = (cat) => {
    setEditingCategoryId(cat._id);
    setCategoryForm({ name: cat.name, rate: cat.rate || '', description: cat.description || '' });
    setCategoryModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form, rate: Number(form.rate || 0), floor: Number(form.floor || 0) };
    if (editingId) {
      await api.updateItem('/rooms', editingId, payload);
      notifySuccess('Room updated successfully');
    } else {
      await api.createItem('/rooms', payload);
      notifySuccess('Room registered successfully');
    }
    setSubmitting(false);
    setModalOpen(false);
    load();
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...categoryForm, rate: Number(categoryForm.rate || 0) };
    if (editingCategoryId) {
      await api.updateItem('/room-categories', editingCategoryId, payload);
      notifySuccess('Category updated successfully');
    } else {
      await api.createItem('/room-categories', payload);
      notifySuccess('Category created successfully');
    }
    setSubmitting(false);
    setCategoryModalOpen(false);
    load();
  };

  const remove = async () => {
    await api.deleteItem('/rooms', confirmDelete._id);
    notifySuccess('Room deleted successfully');
    setConfirmDelete(null);
    load();
  };

  const removeCategory = async () => {
    await api.deleteItem('/room-categories', confirmDeleteCategory._id);
    notifySuccess('Category deleted successfully');
    setConfirmDeleteCategory(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Room Management"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> {tab === 'inventory' ? 'Register Room' : 'Create Room Category'}
          </button>
        }
      />
      <div className="mb-6 flex gap-8 border-b border-brand-border text-[13px] font-semibold">
        <button
          className={`border-b-2 pb-3 ${tab === 'inventory' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-muted'}`}
          onClick={() => setTab('inventory')}
        >
          ROOMS INVENTORY
        </button>
        <button
          className={`border-b-2 pb-3 ${tab === 'categories' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-muted'}`}
          onClick={() => setTab('categories')}
        >
          ROOM CATEGORIES
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <RoomSkeleton key={i} />
          ))}
        </div>
      ) : tab === 'inventory' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => (
            <div key={room._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-content-center rounded-full bg-brand-soft text-brand-blue">
                  <FontAwesomeIcon icon={faBed} />
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary !h-9 !px-3" onClick={() => openEdit(room)}><FontAwesomeIcon icon={faPen} /></button>
                  <button className="btn-danger !h-9" onClick={() => setConfirmDelete(room)}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </div>
              <h3 className="mt-4 text-[18px] font-bold">Room {room.roomNo}</h3>
              <p className="mt-1 text-[13px] text-brand-muted">{room.category}</p>
              <p className="mt-2 text-[13px]">Rate: Rs. {room.rate}</p>
              <p className="text-[13px]">Floor: {room.floor}</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-[12px] ${room.status === 'Available' ? 'bg-green-100 text-green-700' : room.status === 'Occupied' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {room.status}
              </span>
            </div>
          ))}
          {rooms.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted">No rooms registered yet.</div>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roomCategories.map((category) => (
            <div key={category._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-content-center rounded-full bg-brand-soft text-brand-blue">
                  <FontAwesomeIcon icon={faBed} />
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary !h-9 !px-3" onClick={() => openCategoryEdit(category)}><FontAwesomeIcon icon={faPen} /></button>
                  <button className="btn-danger !h-9" onClick={() => setConfirmDeleteCategory(category)}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </div>
              <h3 className="mt-4 text-[18px] font-bold">{category.name}</h3>
              <p className="mt-1 text-[13px] text-brand-muted">{category.description}</p>
              <p className="mt-2 text-[13px]">Standard rate: Rs. {category.rate}</p>
            </div>
          ))}
          {roomCategories.length === 0 && <div className="col-span-full py-20 text-center text-brand-muted">No categories created yet.</div>}
        </div>
      )}

      {/* Register / Edit Room Modal */}
      <Modal open={modalOpen} title={editingId ? 'Update Room' : 'Register Room'} onClose={() => !submitting && setModalOpen(false)} width="520px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingId ? 'Updating room...' : 'Registering room...'}
              </p>
            </div>
          )}
          <form onSubmit={submit} className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`}>
            <div>
              <label className="label">Room No</label>
              <input className="input" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => { const cat = roomCategories.find((c) => c.name === e.target.value); setForm({ ...form, category: e.target.value, rate: cat ? cat.rate : '' }); }} required>
                <option value="">Select Category</option>
                {roomCategories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rate</label>
              <input className="input bg-slate-50" value={form.rate} readOnly disabled />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Available</option>
                <option>Occupied</option>
                <option>Maintenance</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Floor</label>
              <input className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div className="md:col-span-2 mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Room' : 'Save Room'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} message={`Delete room ${confirmDelete?.roomNo}?`} onClose={() => setConfirmDelete(null)} onConfirm={remove} />

      {/* Create / Edit Category Modal */}
      <Modal open={categoryModalOpen} title={editingCategoryId ? 'Update Category' : 'Create Room Category'} onClose={() => !submitting && setCategoryModalOpen(false)} width="480px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingCategoryId ? 'Updating category...' : 'Creating category...'}
              </p>
            </div>
          )}
          <form onSubmit={submitCategory} className={`grid gap-4 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`}>
            <div>
              <label className="label">Category Name</label>
              <input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Standard Rate</label>
              <input type="number" className="input" value={categoryForm.rate} onChange={(e) => setCategoryForm({ ...categoryForm, rate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[100px]" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setCategoryModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteCategory}
        message={`Delete category "${confirmDeleteCategory?.name}"?`}
        onClose={() => setConfirmDeleteCategory(null)}
        onConfirm={removeCategory}
      />
    </div>
  );
}
