import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faUsers, faUtensils, faUserGroup, faClock } from '@fortawesome/free-solid-svg-icons';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { DashboardStatSkeleton } from '../../components/common/Skeleton';

export default function ReceptionDashboardPage({ api, updateTrigger }) {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = await api.fetchList('/dashboard');
      setStats(data);
    };
    load();
  }, [api, updateTrigger]);

  if (!stats) return (
    <div>
      <PageHeader title="Reception Overview" subtitle="Real-time Hotel & Restaurant Status" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => <DashboardStatSkeleton key={i} />)}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title="Reception Overview" 
        subtitle="Real-time Hotel & Restaurant Status"
      />
      
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* ROOM STATUS */}
        <StatCard 
          icon={<FontAwesomeIcon icon={faBed} className="text-green-600" />} 
          label="Available Rooms" 
          value={stats.roomsAvailable} 
          subvalue={`Total Rooms: ${stats.totalRooms}`}
          accent="border-l-green-500" 
        />
        
        <StatCard 
          icon={<FontAwesomeIcon icon={faUserGroup} className="text-indigo-500" />} 
          label="Active Guests" 
          value={stats.totalGuests} 
          accent="border-l-indigo-500" 
        />

        <StatCard 
          icon={<FontAwesomeIcon icon={faClock} className="text-amber-500" />} 
          label="Recent Activity" 
          value="Check-ins" 
          subvalue="Real-time updates active"
          accent="border-l-amber-500" 
        />
      </div>

      <div className="card mt-7 overflow-hidden">
        <div className="border-b border-brand-border bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3 text-[16px] font-extrabold text-slate-800">
            <FontAwesomeIcon icon={faUtensils} className="text-orange-500" /> 
            RESTAURANT STATUS
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Total Tables</p>
              <h4 className="mt-1 text-[28px] font-black text-slate-800">{stats.totalTables}</h4>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Active Tables</p>
              <h4 className="mt-1 text-[28px] font-black text-green-600">{stats.activeTables}</h4>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <p className="text-[12px] font-bold uppercase tracking-wider text-brand-muted">Pending Orders</p>
              <h4 className="mt-1 text-[28px] font-black text-orange-500">{stats.pendingOrders}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-[16px] font-bold text-slate-800 uppercase tracking-tight mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
             <button className="btn-secondary !justify-start !h-12" onClick={() => navigate('/reception/booking-management')}>
                New Booking
             </button>
             <button className="btn-secondary !justify-start !h-12" onClick={() => navigate('/reception/room-management')}>
                Room Status
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
