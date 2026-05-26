import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faPen, faPlus, faTrash, faUpload, faUser } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PasswordInput from '../components/common/PasswordInput';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

const StaffSkeleton = () => (
  <div className="card animate-pulse p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="h-14 w-14 rounded-full bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
        <div className="h-9 w-10 rounded-xl bg-slate-200" />
      </div>
    </div>
    <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
    <div className="mt-2 h-6 w-20 rounded bg-slate-100" />
    <div className="mt-4 space-y-2">
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-5/6 rounded bg-slate-100" />
      <div className="h-4 w-4/6 rounded bg-slate-100" />
    </div>
  </div>
);


const defaultForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  role: 'Reception',
  salary: '',
  joinedDate: '',
  password: 'admin123',
  documentType: 'Citizenship',
  documentNo: '',
  profileImage: '',
  documentImage: '',
};

export default function StaffPage({ api, updateTrigger }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);


  const load = async () => {
    if (items.length === 0) setLoading(true);
    const rows = await api.fetchList('/staff');
    setItems(rows.filter((row) => row.role !== 'Admin'));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [updateTrigger]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();
    return items.filter((item) => [item.name, item.email, item.role, item.phone].some((value) => (value || '').toLowerCase().includes(query)));
  }, [items, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      ...defaultForm,
      ...item,
      salary: item.salary || '',
      joinedDate: item.joinedDate ? item.joinedDate.slice(0, 10) : '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleFile = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm((current) => ({ ...current, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) return notifyError('Contact number must be 10 digits');
    setShowConfirmSubmit(true);
  };

  const handleActualSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    const payload = {
      ...form,
      salary: Number(form.salary || 0),
      joinedDate: form.joinedDate || null,
    };

    if (!payload.password) delete payload.password;

    try {
      if (editingId) {
        await api.updateItem('/staff', editingId, payload);
        notifySuccess('User updated successfully');
      } else {
        await api.createItem('/staff', payload);
        notifySuccess('Staff created successfully');
      }

      setModalOpen(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      // Error is handled by api utility usually, but we could add more here
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await api.deleteItem('/staff', confirmDelete._id);
    notifySuccess('Staff deleted successfully');
    setConfirmDelete(null);
    load();
  };

  const handleDownload = () => {
    const headers = ['Name', 'Email', 'Role', 'Phone', 'Address', 'Salary'];
    const rows = filteredItems.map((item) => [item.name, item.email, item.role, item.phone || '', item.address || '', item.salary || 0]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'staff.csv';
    link.click();
    setConfirmDownload(false);
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        actions={
          <>
            <button className="btn-success" onClick={() => setConfirmDownload(true)}><FontAwesomeIcon icon={faDownload} /> Download CSV</button>
            <button className="btn-primary" onClick={openCreate}><FontAwesomeIcon icon={faPlus} /> Register Staff</button>
          </>
        }
      />

      <div className="mb-5 max-w-sm">
        <input className="input" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <StaffSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div key={item._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-14 w-14 place-content-center rounded-full bg-slate-100 text-brand-muted">
                  {item.profileImage ? <img src={item.profileImage} alt={item.name} className="h-14 w-14 rounded-full object-cover" /> : <FontAwesomeIcon icon={faUser} />}
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary !h-9 !px-3" onClick={() => openEdit(item)}>
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button className="btn-danger !h-9" onClick={() => setConfirmDelete(item)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
              <h3 className="mt-4 text-[18px] font-bold leading-tight">{item.name}</h3>
              <span className="mt-2 inline-flex rounded bg-blue-100 px-3 py-1 text-[12px] text-blue-700">{item.role}</span>
              <div className="mt-4 space-y-1 text-[13px] text-brand-muted">
                <p>Addr: {item.address || '-'}</p>
                <p>Ph: {item.phone || '-'}</p>
                <p>Email: {item.email}</p>
              </div>
            </div>
          ))}
          {!loading && filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center text-brand-muted">No staff members found.</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? 'Update Staff' : 'Register Staff'} onClose={() => !submitting && setModalOpen(false)}>
        <div className="relative">
          {/* Blur overlay with spinner while saving */}
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-semibold text-brand-muted">
                {editingId ? 'Updating staff...' : 'Registering staff...'}
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className={`grid gap-4 transition-all duration-200 ${(submitting || showConfirmSubmit) ? 'pointer-events-none blur-[2px]' : ''}`}>
            <div className="mx-auto grid h-24 w-24 place-content-center rounded-full border-2 border-dashed border-slate-400 text-center text-[12px] text-brand-muted">
              {form.profileImage ? <img src={form.profileImage} alt="Profile" className="h-24 w-24 rounded-full object-cover" /> : <span>Profile Pic</span>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="label">Contact No</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {form.phone && form.phone.length !== 10 && (
                  <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
                )}
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option>Reception</option>
                  <option>Waiter</option>
                  <option>Kitchen</option>
                  <option>Housekeeping</option>
                </select>
              </div>
              <div>
                <label className="label">Salary</label>
                <input className="input" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              </div>
              <div>
                <label className="label">Joined Date</label>
                <input className="input" type="date" value={form.joinedDate} onChange={(e) => setForm({ ...form, joinedDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Password</label>
                <PasswordInput
                  value={form.password}
                  placeholder={editingId ? 'Leave blank to keep current password' : ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                />
              </div>
            </div>

            <div className="border-t border-brand-border pt-2">
              <h4 className="mb-3 text-[18px] font-bold">Documents</h4>
              <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                <div>
                  <label className="label">Document Type</label>
                  <select className="input" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
                    <option>Citizenship</option>
                    <option>License</option>
                    <option>Passport</option>
                  </select>
                </div>
                <div>
                  <label className="label">Document No</label>
                  <input className="input" value={form.documentNo} onChange={(e) => setForm({ ...form, documentNo: e.target.value })} />
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-brand-border p-4">
                <p className="text-[13px] font-semibold text-brand-text">Upload Document Copy</p>
                <label className="mt-3 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border text-[13px] text-brand-muted">
                  {form.documentImage
                    ? <img src={form.documentImage} alt="document" className="max-h-32 rounded-lg object-contain" />
                    : <><FontAwesomeIcon icon={faUpload} className="mb-2 text-lg" /> Click to upload document image</>
                  }
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile('documentImage', e.target.files?.[0])} />
                </label>
              </div>
              <div className="mt-4">
                <label className="label">Profile Image</label>
                <input type="file" className="input py-3" accept="image/*" onChange={(e) => handleFile('profileImage', e.target.files?.[0])} />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Staff' : 'Register Staff'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        message={`Delete ${confirmDelete?.name}? This action cannot be undone.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmDownload}
        title="Confirm Download"
        message="Are you sure you want to download the staff list as a CSV file?"
        confirmText="Download"
        confirmClass="btn-success"
        onClose={() => setConfirmDownload(false)}
        onConfirm={handleDownload}
      />

      <ConfirmDialog
        open={showConfirmSubmit}
        title="Confirm Staff Registration"
        message={`Are you sure you want to ${editingId ? 'update' : 'register'} staff member ${form.name}?`}
        confirmText={editingId ? 'Update Staff' : 'Confirm Register'}
        confirmClass="btn-primary"
        onClose={() => setShowConfirmSubmit(false)}
        onConfirm={handleActualSubmit}
      />
    </div>
  );
}
