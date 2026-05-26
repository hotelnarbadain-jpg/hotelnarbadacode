import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faSearch, faBroom, faSprayCanSparkles, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import { CardSkeleton } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify.jsx';

export default function HousekeepingRoomPage({ api, updateTrigger }) {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const load = async () => {
    if (rooms.length === 0) setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const roomRows = await api.fetchList('/rooms');
      setRooms(roomRows);
    } catch (err) {
      console.error('Failed to load room data', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [updateTrigger]);

  const filteredRooms = useMemo(() => {
    const query = search.toLowerCase();
    return rooms.filter((room) => 
      (room.roomNo || '').toString().toLowerCase().includes(query) || 
      (room.category || '').toString().toLowerCase().includes(query) ||
      (room.status || '').toString().toLowerCase().includes(query)
    );
  }, [rooms, search]);

  const handleStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { roomId, newStatus } = pendingStatusChange;
    setUpdatingId(roomId);
    try {
      await api.updateItem('/rooms', roomId, { status: newStatus });
      notifySuccess(`Room status updated to ${newStatus}`);
      load();
    } catch (err) {
      notifyError('Failed to update room status');
    }
    setUpdatingId(null);
    setPendingStatusChange(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700';
      case 'Occupied': return 'bg-brand-soft text-brand-blue';
      case 'Dirty': return 'bg-rose-100 text-rose-700';
      case 'Cleaning': return 'bg-amber-100 text-amber-700';
      case 'Maintenance': return 'bg-slate-200 text-slate-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div>
      <PageHeader 
        title="Housekeeping Rooms" 
        subtitle="Manage Room Cleaning Status"
        actions={
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
              className="input !pl-11" 
              placeholder="Search by Room No, Category, or Status..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            return (
              <div key={room._id} className="card overflow-hidden transition-all hover:shadow-md">
                <div className={`h-1.5 w-full ${getStatusColor(room.status).split(' ')[0]}`} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`grid h-12 w-12 place-content-center rounded-2xl ${getStatusColor(room.status).split(' ')[0]} ${getStatusColor(room.status).split(' ')[1]}`}>
                      <FontAwesomeIcon icon={faBed} className="text-[20px]" />
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusColor(room.status)}`}>
                      {room.status}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-black text-slate-800 uppercase tracking-tight">Room {room.roomNo}</h3>
                  <p className="mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{room.category}</p>

                  <div className="mt-5 space-y-3 border-t border-brand-border pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-2">Update Status</p>
                    <select 
                      className="input !h-10 !text-[13px] font-bold w-full"
                      value={pendingStatusChange?.roomId === room._id ? pendingStatusChange.newStatus : room.status}
                      disabled={updatingId === room._id}
                      onChange={(e) => setPendingStatusChange({
                        roomId: room._id,
                        roomNo: room.roomNo,
                        oldStatus: room.status,
                        newStatus: e.target.value
                      })}
                    >
                      <option value="Available">Available</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Dirty">Dirty</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRooms.length === 0 && (
            <div className="col-span-full py-20 text-center text-[12px] font-black uppercase tracking-widest text-brand-muted">
              No rooms found.
            </div>
          )}
        </div>
      )}

      <ConfirmDialog 
        open={!!pendingStatusChange} 
        title="Confirm Status Change"
        message={pendingStatusChange ? `Are you sure you want to change Room ${pendingStatusChange.roomNo}'s status from ${pendingStatusChange.oldStatus} to ${pendingStatusChange.newStatus}?` : ''}
        confirmText="Confirm Change"
        onClose={() => setPendingStatusChange(null)} 
        onConfirm={handleStatusChange} 
      />
    </div>
  );
}
