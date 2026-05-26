import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle, faTimesCircle, faUser, faPhone, faLocationDot,
  faMoneyBillWave, faFileInvoiceDollar, faCalendarCheck, faClock, faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';
import client from '../api/client';

export default function DeletionApprovalPage({ api, updateTrigger }) {
  const [requests, setRequests] = useState([]);
  const [billRequests, setBillRequests] = useState([]);
  const [shiftRequests, setShiftRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('GUESTS');

  // Guest dialogs
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  // Bill dialogs
  const [confirmApproveBill, setConfirmApproveBill] = useState(null);
  const [confirmRejectBill, setConfirmRejectBill] = useState(null);
  // Shift dialogs
  const [confirmApproveShift, setConfirmApproveShift] = useState(null);
  const [confirmRejectShift, setConfirmRejectShift] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const [guestsData, billsData, shiftData] = await Promise.all([
        api.fetchList('/guests/requests'),
        api.fetchList('/bills'),
        client.get('/shift-sessions/deletion-requests').then(r => r.data)
      ]);
      setRequests(guestsData);
      setBillRequests(billsData.filter(b => b.deletionStatus === 'Requested'));
      setShiftRequests(shiftData);
    } catch (err) {
      notifyError('Failed to load deletion requests');
    }
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [updateTrigger]);

  /* ── Guest actions ── */
  const approveDeletion = async () => {
    try {
      await api.deleteItem('/guests', confirmApprove._id);
      notifySuccess('Guest deletion approved and completed');
      setConfirmApprove(null);
      loadRequests();
    } catch { notifyError('Failed to approve deletion'); }
  };

  const rejectDeletion = async () => {
    try {
      await api.updateItem('/guests', `${confirmReject._id}/reject`, {});
      notifySuccess('Deletion request rejected');
      setConfirmReject(null);
      loadRequests();
    } catch { notifyError('Failed to reject deletion'); }
  };

  /* ── Bill actions ── */
  const approveBillDeletion = async () => {
    try {
      await api.deleteItem('/bills', confirmApproveBill._id);
      notifySuccess('Bill deletion approved and completed');
      setConfirmApproveBill(null);
      loadRequests();
    } catch { notifyError('Failed to approve bill deletion'); }
  };

  const rejectBillDeletion = async () => {
    try {
      await api.updateItem('/bills', confirmRejectBill._id, { deletionStatus: 'none' });
      notifySuccess('Bill deletion request rejected');
      setConfirmRejectBill(null);
      loadRequests();
    } catch { notifyError('Failed to reject bill deletion'); }
  };

  /* ── Shift Session actions ── */
  const approveShiftDeletion = async () => {
    try {
      await client.delete(`/shift-sessions/${confirmApproveShift._id}`);
      notifySuccess('Shift session deletion approved and completed');
      setConfirmApproveShift(null);
      loadRequests();
    } catch { notifyError('Failed to approve shift session deletion'); }
  };

  const rejectShiftDeletion = async () => {
    try {
      await client.put(`/shift-sessions/${confirmRejectShift._id}/reject-delete`);
      notifySuccess('Shift deletion request rejected');
      setConfirmRejectShift(null);
      loadRequests();
    } catch { notifyError('Failed to reject shift deletion request'); }
  };

  const tabs = [
    { key: 'GUESTS', label: 'Guest Requests', icon: faUser, count: requests.length },
    { key: 'BILLS', label: 'Bill Requests', icon: faFileInvoiceDollar, count: billRequests.length },
    { key: 'SHIFTS', label: 'Shift Sessions', icon: faCalendarDays, count: shiftRequests.length },
  ];

  return (
    <div>
      <PageHeader
        title="Deletion Approvals"
        subtitle="Manage deletion requests from the reception staff"
      />

      {/* Tab Bar */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-fit mb-6 border border-brand-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center justify-center gap-2.5 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all duration-300 ${activeTab === t.key ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <FontAwesomeIcon icon={t.icon} /> {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {/* ── GUEST REQUESTS ── */}
          {activeTab === 'GUESTS' && (
            <>
              {requests.map((guest) => (
                <div key={guest._id} className="card group overflow-hidden transition-all hover:shadow-lg border-amber-100 bg-gradient-to-br from-white to-amber-50/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="grid h-12 w-12 place-content-center rounded-2xl bg-amber-100 text-amber-600">
                        <FontAwesomeIcon icon={faUser} className="text-[20px]" />
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">Pending Approval</span>
                    </div>
                    <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{guest.name}</h3>
                    <div className="mt-4 space-y-2.5 border-t border-brand-border pt-4">
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faPhone} className="mr-2" />Phone</span>
                        <span className="text-slate-700">{guest.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faLocationDot} className="mr-2" />City</span>
                        <span className="text-slate-700">{guest.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />Dues</span>
                        <span className="text-green-600">Rs. {guest.totalDue || 0}</span>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setConfirmApprove(guest)} className="btn-primary flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest">
                        <FontAwesomeIcon icon={faCheckCircle} /> Approve
                      </button>
                      <button onClick={() => setConfirmReject(guest)} className="btn-danger-outline flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest">
                        <FontAwesomeIcon icon={faTimesCircle} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="inline-grid h-20 w-20 place-content-center rounded-full bg-slate-100 text-slate-300 mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                  </div>
                  <p className="font-black uppercase tracking-[0.2em] text-slate-400">No pending guest deletion requests</p>
                </div>
              )}
            </>
          )}

          {/* ── BILL REQUESTS ── */}
          {activeTab === 'BILLS' && (
            <>
              {billRequests.map((bill) => (
                <div key={bill._id} className="card group overflow-hidden transition-all hover:shadow-lg border-rose-100 bg-gradient-to-br from-white to-rose-50/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="grid h-12 w-12 place-content-center rounded-2xl bg-rose-100 text-rose-600">
                        <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-[20px]" />
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700">Pending Approval</span>
                    </div>
                    <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{bill.billNo}</h3>
                    <div className="mt-4 space-y-2.5 border-t border-brand-border pt-4">
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faUser} className="mr-2" />Guest</span>
                        <span className="text-slate-700">{bill.guestName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faCalendarCheck} className="mr-2" />Date</span>
                        <span className="text-slate-700">{new Date(bill.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />Amount</span>
                        <span className="text-rose-600">Rs. {bill.grandTotal?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setConfirmApproveBill(bill)} className="btn-primary flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 border-none">
                        <FontAwesomeIcon icon={faCheckCircle} /> Approve
                      </button>
                      <button onClick={() => setConfirmRejectBill(bill)} className="btn-danger-outline flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest">
                        <FontAwesomeIcon icon={faTimesCircle} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {billRequests.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="inline-grid h-20 w-20 place-content-center rounded-full bg-slate-100 text-slate-300 mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                  </div>
                  <p className="font-black uppercase tracking-[0.2em] text-slate-400">No pending bill deletion requests</p>
                </div>
              )}
            </>
          )}

          {/* ── SHIFT SESSION REQUESTS ── */}
          {activeTab === 'SHIFTS' && (
            <>
              {shiftRequests.map((sess) => {
                const variance = ((sess.closingCash || 0) + (sess.closingFonepay || 0)) - ((sess.expectedClosingCash || 0) + (sess.expectedClosingFonepay || 0));
                return (
                  <div key={sess._id} className="card group overflow-hidden transition-all hover:shadow-lg border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="grid h-12 w-12 place-content-center rounded-2xl bg-indigo-100 text-indigo-600">
                          <FontAwesomeIcon icon={faCalendarDays} className="text-[20px]" />
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">Pending Approval</span>
                      </div>
                      <h3 className="text-[16px] font-black text-slate-800 uppercase line-clamp-1">{sess.user?.name || 'Unknown Staff'}</h3>
                      <div className="mt-4 space-y-2.5 border-t border-brand-border pt-4">
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-brand-muted"><FontAwesomeIcon icon={faClock} className="mr-2" />Opened</span>
                          <span className="text-slate-700">{new Date(sess.openedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-brand-muted"><FontAwesomeIcon icon={faClock} className="mr-2" />Closed</span>
                          <span className="text-slate-700">{sess.closedAt ? new Date(sess.closedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <span className="text-brand-muted"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />Variance</span>
                          <span className={variance === 0 ? 'text-emerald-600' : variance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                            {variance > 0 ? '+' : ''}Rs. {variance.toLocaleString()}
                          </span>
                        </div>
                        {sess.remarks && (
                          <div className="text-[12px] italic text-brand-muted bg-slate-50 rounded-lg p-2 border border-brand-border">
                            "{sess.remarks}"
                          </div>
                        )}
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button onClick={() => setConfirmApproveShift(sess)} className="btn-primary flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 border-none">
                          <FontAwesomeIcon icon={faCheckCircle} /> Approve
                        </button>
                        <button onClick={() => setConfirmRejectShift(sess)} className="btn-danger-outline flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest">
                          <FontAwesomeIcon icon={faTimesCircle} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {shiftRequests.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="inline-grid h-20 w-20 place-content-center rounded-full bg-slate-100 text-slate-300 mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                  </div>
                  <p className="font-black uppercase tracking-[0.2em] text-slate-400">No pending shift session deletion requests</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Guest dialogs */}
      <ConfirmDialog open={!!confirmApprove} title="Approve Deletion"
        message={`Permanently delete guest "${confirmApprove?.name}"? This cannot be undone.`}
        onClose={() => setConfirmApprove(null)} onConfirm={approveDeletion} confirmText="Approve & Delete" />
      <ConfirmDialog open={!!confirmReject} title="Reject Request"
        message={`Reject deletion request for "${confirmReject?.name}"?`}
        onClose={() => setConfirmReject(null)} onConfirm={rejectDeletion} confirmText="Reject" confirmClass="btn-danger" />

      {/* Bill dialogs */}
      <ConfirmDialog open={!!confirmApproveBill} title="Approve Bill Deletion"
        message={`Permanently delete bill "${confirmApproveBill?.billNo}"? This cannot be undone.`}
        onClose={() => setConfirmApproveBill(null)} onConfirm={approveBillDeletion} confirmText="Approve & Delete" />
      <ConfirmDialog open={!!confirmRejectBill} title="Reject Bill Request"
        message={`Reject deletion request for bill "${confirmRejectBill?.billNo}"?`}
        onClose={() => setConfirmRejectBill(null)} onConfirm={rejectBillDeletion} confirmText="Reject" confirmClass="btn-danger" />

      {/* Shift Session dialogs */}
      <ConfirmDialog open={!!confirmApproveShift} title="Approve Shift Session Deletion"
        message={`Permanently delete this shift session for "${confirmApproveShift?.user?.name}" (${confirmApproveShift ? new Date(confirmApproveShift.openedAt).toLocaleDateString() : ''})? This cannot be undone.`}
        onClose={() => setConfirmApproveShift(null)} onConfirm={approveShiftDeletion} confirmText="Approve & Delete" />
      <ConfirmDialog open={!!confirmRejectShift} title="Reject Shift Deletion Request"
        message={`Reject deletion request for this shift session by "${confirmRejectShift?.user?.name}"?`}
        onClose={() => setConfirmRejectShift(null)} onConfirm={rejectShiftDeletion} confirmText="Reject" confirmClass="btn-danger" />
    </div>
  );
}
