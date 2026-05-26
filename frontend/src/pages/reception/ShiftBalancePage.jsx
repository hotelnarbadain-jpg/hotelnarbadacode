import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave, faLock, faLockOpen, faClock, faUser,
  faExclamationTriangle, faHistory, faPen, faTrash
} from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';
import client from '../../api/client';

export default function ShiftBalancePage() {
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Open / Close modals
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({ closingCash: '', closingFonepay: '', remarks: '' });

  // Delete request confirm
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState(null);

  // Open / Close forms
  const [openingForm, setOpeningForm] = useState({ openingCash: '0', openingFonepay: '0' });
  const [closingForm, setClosingForm] = useState({ closingCash: '', closingFonepay: '', remarks: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        client.get('/shift-sessions/active'),
        client.get('/shift-sessions/history')
      ]);
      setActiveSession(activeRes.data.active ? activeRes.data : null);
      setHistory(historyRes.data);
    } catch {
      notifyError('Failed to load shift sessions');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  /* ─── Open shift ─── */
  const handleOpenShift = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/shift-sessions/open', {
        openingCash: Number(openingForm.openingCash || 0),
        openingFonepay: Number(openingForm.openingFonepay || 0)
      });
      notifySuccess('Shift session opened successfully');
      setOpenModalOpen(false);
      setOpeningForm({ openingCash: '0', openingFonepay: '0' });
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to open shift');
    } finally { setSubmitting(false); }
  };

  /* ─── Close shift ─── */
  const handleCloseShift = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/shift-sessions/close', {
        closingCash: Number(closingForm.closingCash || 0),
        closingFonepay: Number(closingForm.closingFonepay || 0),
        remarks: closingForm.remarks
      });
      notifySuccess('Shift session closed successfully');
      setCloseModalOpen(false);
      setClosingForm({ closingCash: '', closingFonepay: '', remarks: '' });
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to close shift');
    } finally { setSubmitting(false); }
  };

  /* ─── Edit session ─── */
  const openEdit = (sess) => {
    setEditingSession(sess);
    setEditForm({
      closingCash: sess.closingCash ?? '',
      closingFonepay: sess.closingFonepay ?? '',
      remarks: sess.remarks ?? ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.put(`/shift-sessions/${editingSession._id}`, {
        closingCash: Number(editForm.closingCash || 0),
        closingFonepay: Number(editForm.closingFonepay || 0),
        remarks: editForm.remarks
      });
      notifySuccess('Shift session updated successfully');
      setEditingSession(null);
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update session');
    } finally { setSubmitting(false); }
  };

  /* ─── Request deletion ─── */
  const handleRequestDelete = async () => {
    try {
      await client.put(`/shift-sessions/${confirmDeleteRequest._id}/request-delete`);
      notifySuccess('Deletion request submitted for admin approval');
      setConfirmDeleteRequest(null);
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to submit deletion request');
    }
  };

  /* ─── Variance helpers ─── */
  const expectedCash = activeSession?.calculated?.expectedClosingCash || 0;
  const expectedFonepay = activeSession?.calculated?.expectedClosingFonepay || 0;
  const actualCashNum = Number(closingForm.closingCash || 0);
  const actualFonepayNum = Number(closingForm.closingFonepay || 0);
  const cashVariance = actualCashNum - expectedCash;
  const fonepayVariance = actualFonepayNum - expectedFonepay;

  return (
    <div>
      <PageHeader
        title="Shift Balance Register"
        subtitle="Manage opening/closing balances and daily cash drawer reconciliation"
        actions={
          !activeSession && !loading && (
            <button className="btn-primary" onClick={() => setOpenModalOpen(true)}>
              <FontAwesomeIcon icon={faLockOpen} className="mr-2" /> Open New Shift
            </button>
          )
        }
      />

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-8">
          {/* ── Active Session Panel ── */}
          {activeSession ? (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Meta card */}
              <div className="card p-6 border-l-4 border-l-brand-blue flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Shift</span>
                    <FontAwesomeIcon icon={faLockOpen} className="text-emerald-500" />
                  </div>
                  <h4 className="text-[17px] font-black text-slate-800 uppercase mb-2">Shift Information</h4>
                  <div className="space-y-2 text-[13px] font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} className="text-brand-muted w-4" />
                      <span>{activeSession.session.user?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="text-brand-muted w-4" />
                      <span>{new Date(activeSession.session.openedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button className="btn-danger w-full mt-6 !h-11 font-bold uppercase tracking-wider text-[12px]" onClick={() => setCloseModalOpen(true)}>
                  <FontAwesomeIcon icon={faLock} className="mr-2" /> Close Shift
                </button>
              </div>

              {/* Cash ledger */}
              <div className="card p-6 border-l-4 border-l-amber-500 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Total Cash Drawer</span>
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-amber-500" />
                </div>
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight">Rs. {expectedCash.toLocaleString()}</h3>
                <div className="mt-4 border-t border-slate-100 pt-3 text-[12px] font-bold text-brand-muted space-y-1.5">
                  <div className="flex justify-between">
                    <span>Opening Cash:</span>
                    <span className="text-slate-800">Rs. {activeSession.session.openingCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collected (Shift):</span>
                    <span className="text-emerald-600">+ Rs. {activeSession.calculated.cashCollected.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Fonepay QR ledger */}
              <div className="card p-6 border-l-4 border-l-indigo-500 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Fonepay QR Money</span>
                  <span className="font-extrabold text-[12px] text-indigo-500">QR</span>
                </div>
                <h3 className="text-[28px] font-black text-slate-800 tracking-tight">Rs. {expectedFonepay.toLocaleString()}</h3>
                <div className="mt-4 border-t border-slate-100 pt-3 text-[12px] font-bold text-brand-muted space-y-1.5">
                  <div className="flex justify-between">
                    <span>Opening QR Balance:</span>
                    <span className="text-slate-800">Rs. {activeSession.session.openingFonepay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>QR Received (Shift):</span>
                    <span className="text-indigo-600">+ Rs. {activeSession.calculated.fonepayCollected.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center max-w-lg mx-auto shadow-md">
              <div className="inline-grid h-16 w-16 place-content-center rounded-full bg-slate-100 text-slate-400 mb-4">
                <FontAwesomeIcon icon={faLock} size="lg" />
              </div>
              <h3 className="text-[18px] font-black text-slate-800 uppercase mb-2">Shift is currently Closed</h3>
              <p className="text-[13px] text-brand-muted font-bold mb-6">Open a shift to start recording cash drawer activity.</p>
              <button className="btn-primary mx-auto !px-6" onClick={() => setOpenModalOpen(true)}>
                <FontAwesomeIcon icon={faLockOpen} className="mr-2" /> Open Shift Session
              </button>
            </div>
          )}

          {/* ── History Table ── */}
          <div className="card overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-brand-border flex justify-between items-center">
              <h4 className="text-[14px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} /> Shift Balance History
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-[13px]">
                <thead className="bg-slate-50 text-brand-muted">
                  <tr>
                    <th className="p-4 font-bold">User</th>
                    <th className="font-bold">Shift Start</th>
                    <th className="font-bold">Shift End</th>
                    <th className="font-bold text-right">Opening (Cash / QR)</th>
                    <th className="font-bold text-right">Expected (Cash / QR)</th>
                    <th className="font-bold text-right">Actual (Cash / QR)</th>
                    <th className="font-bold text-right">Variance</th>
                    <th className="font-bold">Remarks</th>
                    <th className="p-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {history.map((sess) => {
                    const totalExpected = (sess.expectedClosingCash || 0) + (sess.expectedClosingFonepay || 0);
                    const totalActual = (sess.closingCash || 0) + (sess.closingFonepay || 0);
                    const variance = totalActual - totalExpected;
                    const isPendingDelete = sess.deletionStatus === 'Requested';

                    return (
                      <tr key={sess._id} className={`hover:bg-slate-50 transition-colors ${isPendingDelete ? 'bg-amber-50/60' : ''}`}>
                        <td className="p-4 font-semibold text-slate-800">{sess.user?.name || 'Unknown'}</td>
                        <td className="text-[12px]">{new Date(sess.openedAt).toLocaleString()}</td>
                        <td className="text-[12px]">{sess.closedAt ? new Date(sess.closedAt).toLocaleString() : '-'}</td>
                        <td className="text-right">
                          <div className="font-semibold text-slate-700">Rs. {sess.openingCash.toLocaleString()}</div>
                          <div className="text-[11px] text-brand-muted">QR: Rs. {sess.openingFonepay.toLocaleString()}</div>
                        </td>
                        <td className="text-right">
                          <div className="font-semibold text-slate-700">Rs. {(sess.expectedClosingCash || 0).toLocaleString()}</div>
                          <div className="text-[11px] text-brand-muted">QR: Rs. {(sess.expectedClosingFonepay || 0).toLocaleString()}</div>
                        </td>
                        <td className="text-right">
                          <div className="font-semibold text-slate-700">Rs. {(sess.closingCash || 0).toLocaleString()}</div>
                          <div className="text-[11px] text-brand-muted">QR: Rs. {(sess.closingFonepay || 0).toLocaleString()}</div>
                        </td>
                        <td className="text-right font-black">
                          <span className={variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                            {variance > 0 ? '+' : ''}Rs. {variance.toLocaleString()}
                          </span>
                        </td>
                        <td className="max-w-[160px] truncate text-brand-muted italic text-[12px]" title={sess.remarks}>
                          {sess.remarks || '-'}
                        </td>
                        <td className="p-4 text-right">
                          {isPendingDelete ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                              Pending Approval
                            </span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn-secondary !h-9 !px-3"
                                title="Edit session"
                                onClick={() => openEdit(sess)}
                              >
                                <FontAwesomeIcon icon={faPen} />
                              </button>
                              <button
                                className="btn-danger !h-9 !px-3"
                                title="Request deletion"
                                onClick={() => setConfirmDeleteRequest(sess)}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-16 text-center text-brand-muted font-bold italic">
                        No shift history records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ OPEN SHIFT MODAL ══ */}
      <Modal open={openModalOpen} title="Open Shift Session" onClose={() => !submitting && setOpenModalOpen(false)} width="400px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-bold text-brand-muted uppercase tracking-widest">Opening Shift...</p>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleOpenShift}>
            <div>
              <label className="label">Opening Cash (Rs.)</label>
              <input type="number" className="input font-semibold" value={openingForm.openingCash}
                onChange={(e) => setOpeningForm({ ...openingForm, openingCash: e.target.value })} required />
            </div>
            <div>
              <label className="label">Opening Fonepay QR Balance (Rs.)</label>
              <input type="number" className="input font-semibold" value={openingForm.openingFonepay}
                onChange={(e) => setOpeningForm({ ...openingForm, openingFonepay: e.target.value })} required />
            </div>
            <div className="flex gap-3 pt-4 border-t border-brand-border">
              <button type="button" className="btn-secondary flex-1 !h-11 uppercase font-bold text-[12px]" onClick={() => setOpenModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-[2] !h-11 uppercase font-bold text-[12px]">Start Shift</button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ══ CLOSE SHIFT MODAL ══ */}
      <Modal open={closeModalOpen} title="Reconcile & Close Shift" onClose={() => !submitting && setCloseModalOpen(false)} width="450px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-bold text-brand-muted uppercase tracking-widest">Closing Shift...</p>
            </div>
          )}
          <form className="space-y-5" onSubmit={handleCloseShift}>
            <div className="bg-slate-50 border border-brand-border rounded-xl p-4 grid grid-cols-2 gap-4 text-[12px]">
              <div>
                <p className="font-bold text-brand-muted">EXPECTED CASH</p>
                <p className="text-[16px] font-black text-slate-800">Rs. {expectedCash.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-bold text-brand-muted">EXPECTED QR</p>
                <p className="text-[16px] font-black text-slate-800">Rs. {expectedFonepay.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Actual Cash Drawer (Rs.)</label>
                <input type="number" className="input font-semibold" value={closingForm.closingCash}
                  onChange={(e) => setClosingForm({ ...closingForm, closingCash: e.target.value })} placeholder="Enter drawer cash" required />
              </div>
              <div>
                <label className="label">Actual Fonepay QR (Rs.)</label>
                <input type="number" className="input font-semibold" value={closingForm.closingFonepay}
                  onChange={(e) => setClosingForm({ ...closingForm, closingFonepay: e.target.value })} placeholder="Enter QR total" required />
              </div>
            </div>
            {(closingForm.closingCash !== '' || closingForm.closingFonepay !== '') && (
              <div className="rounded-xl border border-dashed border-brand-border p-4 bg-slate-50 space-y-2">
                <p className="text-[11px] font-black uppercase text-brand-muted">Variance Reconciliation</p>
                <div className="flex justify-between items-center text-[13px] font-bold">
                  <span>Cash Variance:</span>
                  <span className={cashVariance === 0 ? 'text-emerald-600' : cashVariance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                    {cashVariance > 0 ? '+' : ''}Rs. {cashVariance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px] font-bold">
                  <span>QR Fonepay Variance:</span>
                  <span className={fonepayVariance === 0 ? 'text-emerald-600' : fonepayVariance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                    {fonepayVariance > 0 ? '+' : ''}Rs. {fonepayVariance.toLocaleString()}
                  </span>
                </div>
                {(cashVariance !== 0 || fonepayVariance !== 0) && (
                  <div className="flex gap-2 items-start mt-2 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
                    <span>Discrepancy detected. Please add remarks explaining the variance.</span>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="label">Remarks</label>
              <textarea className="input min-h-[80px]" value={closingForm.remarks}
                onChange={(e) => setClosingForm({ ...closingForm, remarks: e.target.value })}
                placeholder="Discrepancy explanations, notes..." />
            </div>
            <div className="flex gap-3 pt-4 border-t border-brand-border">
              <button type="button" className="btn-secondary flex-1 !h-11 uppercase font-bold text-[12px]" onClick={() => setCloseModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-[2] !h-11 uppercase font-bold text-[12px]">Submit & Close Shift</button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ══ EDIT SESSION MODAL ══ */}
      <Modal open={!!editingSession} title="Edit Shift Session" onClose={() => !submitting && setEditingSession(null)} width="420px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div>
              <p className="text-[13px] font-bold text-brand-muted uppercase tracking-widest">Saving...</p>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="bg-slate-50 rounded-xl border border-brand-border p-3 text-[12px] font-bold text-brand-muted">
              <p>Staff: <span className="text-slate-800">{editingSession?.user?.name}</span></p>
              <p>Opened: <span className="text-slate-800">{editingSession ? new Date(editingSession.openedAt).toLocaleString() : ''}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Actual Closing Cash (Rs.)</label>
                <input type="number" className="input font-semibold" value={editForm.closingCash}
                  onChange={(e) => setEditForm({ ...editForm, closingCash: e.target.value })} />
              </div>
              <div>
                <label className="label">Actual Closing QR (Rs.)</label>
                <input type="number" className="input font-semibold" value={editForm.closingFonepay}
                  onChange={(e) => setEditForm({ ...editForm, closingFonepay: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Remarks</label>
              <textarea className="input min-h-[80px]" value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Update notes or explanation..." />
            </div>
            <div className="flex gap-3 pt-4 border-t border-brand-border">
              <button type="button" className="btn-secondary flex-1 !h-11 uppercase font-bold text-[12px]" onClick={() => setEditingSession(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-[2] !h-11 uppercase font-bold text-[12px]">Save Changes</button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ══ DELETE REQUEST CONFIRM ══ */}
      <ConfirmDialog
        open={!!confirmDeleteRequest}
        title="Request Deletion"
        message={`Submit deletion request for this shift session (${confirmDeleteRequest?.user?.name}, ${confirmDeleteRequest ? new Date(confirmDeleteRequest.openedAt).toLocaleDateString() : ''})? An admin must approve before it is permanently deleted.`}
        onClose={() => setConfirmDeleteRequest(null)}
        onConfirm={handleRequestDelete}
        confirmText="Submit Request"
      />
    </div>
  );
}
