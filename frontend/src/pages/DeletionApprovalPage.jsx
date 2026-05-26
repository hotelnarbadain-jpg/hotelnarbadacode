import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faUser, faPhone, faLocationDot, faMoneyBillWave, faFileInvoiceDollar, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

export default function DeletionApprovalPage({ api, updateTrigger }) {
  const [requests, setRequests] = useState([]);
  const [billRequests, setBillRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('GUESTS');
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [confirmApproveBill, setConfirmApproveBill] = useState(null);
  const [confirmRejectBill, setConfirmRejectBill] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.fetchList('/guests/requests');
      setRequests(data);
      const billsData = await api.fetchList('/bills');
      setBillRequests(billsData.filter(b => b.deletionStatus === 'Requested'));
    } catch (err) {
      notifyError('Failed to load deletion requests');
    }
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [updateTrigger]);

  const approveDeletion = async () => {
    try {
      await api.deleteItem('/guests', confirmApprove._id);
      notifySuccess('Guest deletion approved and completed');
      setConfirmApprove(null);
      loadRequests();
    } catch (err) {
      notifyError('Failed to approve deletion');
    }
  };

  const rejectDeletion = async () => {
    try {
      await api.updateItem('/guests', `${confirmReject._id}/reject`, {});
      notifySuccess('Deletion request rejected');
      setConfirmReject(null);
      loadRequests();
    } catch (err) {
      notifyError('Failed to reject deletion');
    }
  };

  const approveBillDeletion = async () => {
    try {
      await api.deleteItem('/bills', confirmApproveBill._id);
      notifySuccess('Bill deletion approved and completed');
      setConfirmApproveBill(null);
      loadRequests();
    } catch (err) {
      notifyError('Failed to approve bill deletion');
    }
  };

  const rejectBillDeletion = async () => {
    try {
      await api.updateItem('/bills', confirmRejectBill._id, { deletionStatus: 'none' });
      notifySuccess('Bill deletion request rejected');
      setConfirmRejectBill(null);
      loadRequests();
    } catch (err) {
      notifyError('Failed to reject bill deletion');
    }
  };

  return (
    <div>
      <PageHeader 
        title="Deletion Approvals" 
        subtitle="Manage deletion requests from the reception staff"
      />

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-fit mb-6 border border-brand-border">
        <button
          onClick={() => setActiveTab('GUESTS')}
          className={`flex items-center justify-center gap-2.5 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all duration-300 ${activeTab === 'GUESTS' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
        >
          <FontAwesomeIcon icon={faUser} /> Guest Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('BILLS')}
          className={`flex items-center justify-center gap-2.5 px-5 py-2 rounded-lg text-[13.5px] font-bold transition-all duration-300 ${activeTab === 'BILLS' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
        >
          <FontAwesomeIcon icon={faFileInvoiceDollar} /> Bill Requests ({billRequests.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeTab === 'GUESTS' ? (
            <>
              {requests.map((guest) => (
                <div key={guest._id} className="card group overflow-hidden transition-all hover:shadow-lg border-amber-100 bg-gradient-to-br from-white to-amber-50/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="grid h-12 w-12 place-content-center rounded-2xl bg-amber-100 text-amber-600">
                        <FontAwesomeIcon icon={faUser} className="text-[20px]" />
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                        Pending Approval
                      </span>
                    </div>

                    <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{guest.name}</h3>
                    <div className="mt-4 space-y-2.5 border-t border-brand-border pt-4">
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faPhone} className="mr-2" /> Phone</span>
                        <span className="text-slate-700">{guest.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faLocationDot} className="mr-2" /> City</span>
                        <span className="text-slate-700">{guest.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" /> Dues</span>
                        <span className="text-green-600">Rs. {guest.totalDue || 0}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => setConfirmApprove(guest)}
                        className="btn-primary flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} /> Approve
                      </button>
                      <button 
                        onClick={() => setConfirmReject(guest)}
                        className="btn-danger-outline flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest"
                      >
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
          ) : (
            <>
              {billRequests.map((bill) => (
                <div key={bill._id} className="card group overflow-hidden transition-all hover:shadow-lg border-rose-100 bg-gradient-to-br from-white to-rose-50/20">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="grid h-12 w-12 place-content-center rounded-2xl bg-rose-100 text-rose-600">
                        <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-[20px]" />
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700">
                        Pending Approval
                      </span>
                    </div>

                    <h3 className="text-[18px] font-black text-slate-800 uppercase line-clamp-1">{bill.billNo}</h3>
                    <div className="mt-4 space-y-2.5 border-t border-brand-border pt-4">
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faUser} className="mr-2" /> Guest</span>
                        <span className="text-slate-700">{bill.guestName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faCalendarCheck} className="mr-2" /> Date</span>
                        <span className="text-slate-700">{new Date(bill.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-bold">
                        <span className="text-brand-muted"><FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" /> Amount</span>
                        <span className="text-rose-600">Rs. {bill.grandTotal?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => setConfirmApproveBill(bill)}
                        className="btn-primary flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 border-none"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} /> Approve
                      </button>
                      <button 
                        onClick={() => setConfirmRejectBill(bill)}
                        className="btn-danger-outline flex-1 !h-11 flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest"
                      >
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
        </div>
      )}

      <ConfirmDialog 
        open={!!confirmApprove} 
        title="Approve Deletion"
        message={`Are you sure you want to permanently delete guest "${confirmApprove?.name}"? This action cannot be undone.`}
        onClose={() => setConfirmApprove(null)} 
        onConfirm={approveDeletion}
        confirmText="Approve & Delete"
      />

      <ConfirmDialog 
        open={!!confirmReject} 
        title="Reject Request"
        message={`Are you sure you want to reject the deletion request for "${confirmReject?.name}"?`}
        onClose={() => setConfirmReject(null)} 
        onConfirm={rejectDeletion}
        confirmText="Reject"
        confirmClass="btn-danger"
      />
      <ConfirmDialog 
        open={!!confirmApproveBill} 
        title="Approve Bill Deletion"
        message={`Are you sure you want to permanently delete bill "${confirmApproveBill?.billNo}"? This action cannot be undone.`}
        onClose={() => setConfirmApproveBill(null)} 
        onConfirm={approveBillDeletion}
        confirmText="Approve & Delete"
      />

      <ConfirmDialog 
        open={!!confirmRejectBill} 
        title="Reject Bill Request"
        message={`Are you sure you want to reject the deletion request for bill "${confirmRejectBill?.billNo}"?`}
        onClose={() => setConfirmRejectBill(null)} 
        onConfirm={rejectBillDeletion}
        confirmText="Reject"
        confirmClass="btn-danger"
      />
    </div>
  );
}
