import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faPrint, faTrash, faEye, faMagnifyingGlass, faTimes, faEdit } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../utils/notify.jsx';
import client from '../api/client';

const TableSkeleton = () => (
  <div className="card overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-slate-50 text-[12px] font-bold uppercase tracking-wider text-brand-muted">
        <tr>
          <th className="px-6 py-4">Bill No</th>
          <th className="px-6 py-4">Guest Name</th>
          <th className="px-6 py-4">Date</th>
          <th className="px-6 py-4 text-right">Amount</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border">
        {[...Array(5)].map((_, i) => (
          <tr key={i} className="animate-pulse">
            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></td>
            <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full"></div></td>
            <td className="px-6 py-4"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-slate-200 rounded-lg"></div><div className="h-8 w-8 bg-slate-200 rounded-lg"></div></div></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function BillsManagementPage({ api, updateTrigger }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [viewBill, setViewBill] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      // Add 1s delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const [billList, hotelProfile] = await Promise.all([
        api.fetchList('/bills'),
        client.get('/profile').then(res => res.data)
      ]);
      setBills(billList);
      setProfile(hotelProfile);
    } catch (err) {
      notifyError('Failed to load bills');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [updateTrigger]);

  const handleDelete = async () => {
    try {
      const res = await api.deleteItem('/bills', confirmDelete._id);
      notifySuccess(res.message);
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to delete bill');
    }
  };

  const filteredBills = bills.filter(b => 
    b.billNo?.toLowerCase().includes(search.toLowerCase()) ||
    b.guestName?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader 
        title="Bills Management" 
        subtitle="Manage and print guest bills"
      />

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input 
            type="text" 
            placeholder="Search by Bill No or Guest Name..." 
            className="input !pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? <TableSkeleton /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[12px] font-bold uppercase tracking-wider text-brand-muted">
              <tr>
                <th className="px-6 py-4">Bill No</th>
                <th className="px-6 py-4">Guest Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredBills.map(bill => (
                <tr key={bill._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-blue">{bill.billNo}</td>
                  <td className="px-6 py-4 font-semibold">{bill.guestName}</td>
                  <td className="px-6 py-4 text-[13px]">{new Date(bill.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-700">Rs. {bill.grandTotal.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {bill.deletionStatus === 'Requested' ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-600">Deletion Pending</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-600">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary !h-9 !px-3" onClick={() => setViewBill(bill)} title="View Bill">
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button className="btn-secondary !h-9 !px-3" onClick={() => navigate('/reception/checkout-management', { state: { editBill: bill } })} title="Edit Bill">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn-primary !h-9 !px-3" onClick={() => { setViewBill(bill); setTimeout(() => window.print(), 300); }} title="Print Bill">
                        <FontAwesomeIcon icon={faPrint} />
                      </button>
                      <button className="btn-danger !h-9 !px-3" onClick={() => setConfirmDelete(bill)} title="Delete Bill">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-brand-muted italic">No bills found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill View/Print Modal */}
      <Modal 
        open={!!viewBill} 
        onClose={() => setViewBill(null)} 
        width="1000px" 
        title="Bill Preview"
        actions={
          <button className="btn-primary" onClick={handlePrint}>
            <FontAwesomeIcon icon={faPrint} /> Print Bill
          </button>
        }
      >
        {viewBill && <BillPrintContent bill={viewBill} profile={profile} onClose={() => setViewBill(null)} />}
      </Modal>

      <ConfirmDialog 
        open={!!confirmDelete} 
        title="Confirm Delete"
        message={confirmDelete?.deletionStatus === 'Requested' ? "Delete this bill (Approval Pending)?" : "Delete this bill? Admin approval will be required if you are not an admin."}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

export function BillPrintContent({ bill, profile, onClose }) {
  const ReceiptContent = () => (
    <div className="receipt-content text-black font-bold">
      <div className="text-center mb-1 text-[18px] leading-tight uppercase">{profile.officialHotelName || 'HOTEL NARBADA INN'}</div>
      <div className="text-center text-[13px] leading-tight font-normal">
        {profile.physicalAddress || 'Bhairahawa, Nepal'}<br/>
        Phone: {profile.primaryContactNo || 'N/A'}<br/>
      </div>
      <div className="text-center text-[15px] font-black uppercase mt-1">ESTIMATE ORDER SLIP</div>
      
      <div className="border-t-2 border-dashed border-black my-2"></div>
      
      <div className="text-[13px] leading-tight">
        <div className="flex justify-between">
          <span>Bill No: {bill.billNo}</span>
          <span>Date: {new Date(bill.date).toLocaleDateString()}</span>
        </div>
        <div>Guest: {bill.guestName}</div>
        {bill.roomNo && bill.roomNo !== 'N/A' && <div>Room/Table: {bill.roomNo}</div>}
      </div>

      <div className="border-t-2 border-dashed border-black my-2"></div>

      <table className="w-full text-[13px] leading-tight text-black table-fixed">
        <thead>
          <tr className="border-y-2 border-dashed border-black">
            <th className="text-left py-1 w-[55%] font-bold">Item</th>
            <th className="text-right py-1 w-[15%] font-bold">Qty</th>
            <th className="text-right py-1 w-[30%] font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {(bill.rooms || []).map((r, i) => (
            <tr key={`rm-${i}`}>
              <td className="py-1 break-words">Room {r.roomNo}</td>
              <td className="text-right py-1">1</td>
              <td className="text-right py-1">{r.total?.toLocaleString()}</td>
            </tr>
          ))}
          {(bill.restaurantItems || []).map((item, i) => (
            <tr key={`it-${i}`}>
              <td className="py-1 break-words">{item.item}</td>
              <td className="text-right py-1">{item.qty}</td>
              <td className="text-right py-1">{item.total?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-dashed border-black my-2"></div>

      <div className="text-[14px] font-bold leading-tight">
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span>{bill.subTotal?.toLocaleString()}</span>
        </div>
        {(bill.discount || 0) > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>{bill.discount?.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between mt-1 text-[15px]">
          <span>Total:</span>
          <span>Rs. {bill.grandTotal?.toLocaleString()}</span>
        </div>
        {(bill.advancePaid || 0) > 0 && (
          <div className="flex justify-between text-[13px] italic">
            <span>Advance Paid:</span>
            <span>- {bill.advancePaid?.toLocaleString()}</span>
          </div>
        )}
        {(bill.advancePaid || 0) > 0 && (
          <div className="flex justify-between mt-1 text-[16px] border-t border-dashed border-black pt-1">
            <span>Net Payable:</span>
            <span>Rs. {(Number(bill.grandTotal || 0) - Number(bill.advancePaid || 0)).toLocaleString()}</span>
          </div>
        )}
        {(bill.totalDue || 0) > 0 && (
          <>
            <div className="flex justify-between mt-1 text-[13px] font-normal">
              <span>Paid:</span>
              <span>{bill.amountPaid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span>Due:</span>
              <span>{bill.totalDue?.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-t-2 border-dashed border-black my-2"></div>

      <div className="text-center mt-8 mb-2">
        <div className="border-t border-black w-24 mx-auto mb-1"></div>
        <div className="text-[12px] font-normal">Signature</div>
      </div>

      <div className="text-center mt-2 mb-2 text-[12px] leading-tight font-normal">
        {profile.welcomeMessage || 'Thank you for your visit!'}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. SCREEN PREVIEW */}
      <div className="bill-screen-preview no-print font-mono bg-slate-200 p-4 rounded-xl flex justify-center max-h-[70vh] overflow-y-auto">
        <div className="bg-white p-4 shadow-lg w-[320px]">
          <ReceiptContent />
        </div>
      </div>

      {/* 2. PRINT VERSION (Hidden on screen, 76mm Receipt Portal for Printer) */}
      {createPortal(
        <div className="bill-print-portal font-mono text-black">
          <style>{`
            @media screen {
              .bill-print-portal { display: none !important; }
            }
             @media print {
               @page {
                 size: 80mm auto;
                 margin: 0 !important;
               }
               body > *:not(.bill-print-portal):not(.kot-print-portal) { display: none !important; }
               #root, .modal-backdrop, .modal-container, .no-print { display: none !important; }
              
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm !important;
                overflow: hidden !important;
              }
              
              .bill-print-portal {
                display: inline-block !important;
                width: 80mm !important; 
                margin: 0 !important;
                padding: 2mm !important;
                padding-bottom: 1cm !important; 
                background: white !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>
          
          <ReceiptContent />
        </div>,
        document.body
      )}
    </>
  );
}
