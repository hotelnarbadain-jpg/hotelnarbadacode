import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBroom, faBed, faSprayCanSparkles } from '@fortawesome/free-solid-svg-icons';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import { DashboardStatSkeleton } from '../../components/common/Skeleton';

export default function HousekeepingDashboardPage({ api, updateTrigger }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const rooms = await api.fetchList('/rooms');
      setStats({
        totalRooms: rooms.length,
        dirty: rooms.filter(r => r.status === 'Dirty').length,
        cleaning: rooms.filter(r => r.status === 'Cleaning').length,
        maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      });
    };
    load();
  }, [api, updateTrigger]);

  if (!stats) return (
    <div>
      <PageHeader title="Housekeeping Overview" subtitle="Real-time Room Status" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => <DashboardStatSkeleton key={i} />)}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title="Housekeeping Overview" 
        subtitle="Real-time Room Status"
      />
      
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard 
          icon={<FontAwesomeIcon icon={faBroom} className="text-rose-500" />} 
          label="Dirty Rooms" 
          value={stats.dirty} 
          subvalue={`Requires Cleaning`}
          accent="border-l-rose-500" 
        />
        
        <StatCard 
          icon={<FontAwesomeIcon icon={faSprayCanSparkles} className="text-blue-500" />} 
          label="Cleaning in Progress" 
          value={stats.cleaning} 
          accent="border-l-blue-500" 
        />

        <StatCard 
          icon={<FontAwesomeIcon icon={faBed} className="text-slate-500" />} 
          label="Maintenance" 
          value={stats.maintenance} 
          accent="border-l-slate-500" 
        />
      </div>
    </div>
  );
}
