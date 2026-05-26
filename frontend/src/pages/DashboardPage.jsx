import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faMoneyBillWave, faUsers, faUtensils, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import StatCard from '../components/common/StatCard';
import PageHeader from '../components/common/PageHeader';

const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card border-l-4 border-l-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-3 w-20 rounded bg-slate-200 mb-2" />
              <div className="h-8 w-32 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="card mt-7 p-6">
      <div className="h-6 w-48 rounded bg-slate-200 mb-6" />
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-50 p-5">
            <div className="h-3 w-16 rounded bg-slate-200 mb-3" />
            <div className="h-8 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function DashboardPage({ api, updateTrigger }) {
  const [stats, setStats] = useState(null);

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
      <PageHeader title="Hotel Overview" />
      <DashboardSkeleton />
    </div>
  );

  return (
    <div>
      <PageHeader title="Hotel Overview" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FontAwesomeIcon icon={faUsers} className="text-brand-blue" />} label="Total Staff" value={stats.totalStaff} accent="border-l-blue-500" />
        <StatCard icon={<FontAwesomeIcon icon={faBed} className="text-green-600" />} label="Rooms (Occ/Avail)" value={`${stats.roomsOccupied} / ${stats.roomsAvailable}`} subvalue={`Total: ${stats.totalRooms}`} accent="border-l-green-500" />
        <StatCard icon={<FontAwesomeIcon icon={faUserGroup} className="text-indigo-500" />} label="Total Guests" value={stats.totalGuests} accent="border-l-indigo-500" />
        <StatCard icon={<FontAwesomeIcon icon={faMoneyBillWave} className="text-amber-500" />} label="Today's Revenue" value={`Rs. ${stats.todayRevenue}`} accent="border-l-amber-500" />
      </div>
      <div className="card mt-7 p-6">
        <div className="mb-4 flex items-center gap-3 text-[16px] font-extrabold">
          <FontAwesomeIcon icon={faUtensils} className="text-orange-500" /> Restaurant Status
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-[12px] text-brand-muted">Total Tables</p><h4 className="text-[28px] font-bold">{stats.totalTables}</h4></div>
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-[12px] text-brand-muted">Active Tables</p><h4 className="text-[28px] font-bold text-green-500">{stats.activeTables}</h4></div>
          <div className="rounded-2xl bg-slate-50 p-5"><p className="text-[12px] text-brand-muted">Pending Orders</p><h4 className="text-[28px] font-bold text-orange-500">{stats.pendingOrders}</h4></div>
        </div>
      </div>
    </div>
  );
}
