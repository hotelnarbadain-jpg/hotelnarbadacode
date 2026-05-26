import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faSearch, faUser, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const RoomSkeleton = () => (
  <div className="card animate-pulse overflow-hidden">
    <div className="h-1.5 w-full bg-slate-200" />
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="h-6 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="h-6 w-24 rounded bg-slate-200 mb-2" />
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-5 space-y-3 border-t border-brand-border pt-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-4 w-20 rounded bg-slate-200" />
        </div>
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-4 w-20 rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-100 h-20 w-full" />
    </div>
  </div>
);

export default function ReceptionRoomPage({ api, updateTrigger }) {
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (rooms.length === 0) setLoading(true);
    try {
      // Add 1s delay for skeleton effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [roomRows, guestRows] = await Promise.all([
        api.fetchList('/rooms'),
        api.fetchList('/guests'),
      ]);
      setRooms(roomRows);
      setGuests(guestRows.filter(g => g.status === 'Checked In'));
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
      room.roomNo.toLowerCase().includes(query) || 
      room.category.toLowerCase().includes(query)
    );
  }, [rooms, search]);

  const getGuestForRoom = (roomNo) => {
    return guests.find(g => (g.rooms || []).some(r => r.roomNo === roomNo) || g.roomNo === roomNo);
  };

  return (
    <div>
      <PageHeader 
        title="Room Directory" 
        subtitle="View Room Availability & Current Occupancy"
        actions={
          <div className="relative w-full sm:w-80">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
              className="input !pl-11" 
              placeholder="Search by Room No or Category..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <RoomSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const currentGuest = getGuestForRoom(room.roomNo);
            const isOccupied = room.status === 'Occupied';
            
            return (
              <div key={room._id} className="card group overflow-hidden transition-all hover:shadow-md">
                <div className={`h-1.5 w-full ${
                  room.status === 'Available' ? 'bg-green-500' : 
                  room.status === 'Occupied' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />
                
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="grid h-12 w-12 place-content-center rounded-2xl bg-slate-100 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white">
                      <FontAwesomeIcon icon={faBed} className="text-[20px]" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                      room.status === 'Available' ? 'bg-green-100 text-green-700' : 
                      room.status === 'Occupied' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {room.status}
                    </span>
                  </div>

                  <h3 className="text-[20px] font-black text-slate-800">Room {room.roomNo}</h3>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-brand-muted">{room.category}</p>
                  
                  <div className="mt-5 space-y-3 border-t border-brand-border pt-4">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-brand-muted">Nightly Rate</span>
                      <span className="font-bold text-slate-800 uppercase">Rs. {room.rate}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-brand-muted">Floor</span>
                      <span className="font-bold text-slate-800 uppercase">{room.floor || 'N/A'}</span>
                    </div>
                  </div>

                  {isOccupied && currentGuest && (
                    <div className="mt-4 rounded-xl bg-blue-50 p-4 border border-blue-100">
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faUser} className="mt-1 text-blue-600" />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-blue-700">Current Occupant</p>
                          <p className="text-[14px] font-bold text-blue-900 leading-tight mt-0.5">{currentGuest.name}</p>
                          <p className="text-[11px] font-medium text-blue-600 mt-0.5 uppercase">Since {new Date(currentGuest.checkInDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isOccupied && (
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-brand-muted italic uppercase">
                      <FontAwesomeIcon icon={faCircleInfo} />
                      {room.status === 'Available' ? 'Ready for Check-in' : 'Under Maintenance'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRooms.length === 0 && (
            <div className="col-span-full py-20 text-center text-brand-muted font-bold uppercase tracking-widest">
              No rooms found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
