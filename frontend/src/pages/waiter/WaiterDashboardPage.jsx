import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faClock, faFireBurner, faCheckCircle, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import { DashboardStatSkeleton } from '../../components/common/Skeleton';

export default function WaiterDashboardPage({ api, updateTrigger }) {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const orders = await api.fetchList('/restaurant-orders');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
      
      setStats({
        totalToday: todayOrders.length,
        pending: orders.filter(o => o.status === 'Pending').length,
        preparing: orders.filter(o => o.status === 'Preparing').length,
        served: orders.filter(o => o.status === 'Served').length,
      });
    };
    load();
  }, [api, updateTrigger]);

  if (!stats) return (
    <div>
      <PageHeader title="Waiter Dashboard" subtitle="Real-time Order Status" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => <DashboardStatSkeleton key={i} />)}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title="Waiter Dashboard" 
        subtitle="Real-time Restaurant Order Status"
      />
      
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          icon={<FontAwesomeIcon icon={faClipboardList} className="text-slate-600" />} 
          label="Total Orders (Today)" 
          value={stats.totalToday} 
          accent="border-l-slate-500" 
        />
        <StatCard 
          icon={<FontAwesomeIcon icon={faClock} className="text-orange-500" />} 
          label="Pending Orders" 
          value={stats.pending} 
          accent="border-l-orange-500" 
        />
        <StatCard 
          icon={<FontAwesomeIcon icon={faFireBurner} className="text-rose-500" />} 
          label="Preparing in Kitchen" 
          value={stats.preparing} 
          accent="border-l-rose-500" 
        />
        <StatCard 
          icon={<FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />} 
          label="Orders Served" 
          value={stats.served} 
          accent="border-l-green-500" 
        />
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div className="card p-6 border-brand-blue/10">
          <h3 className="text-[16px] font-extrabold text-brand-blue uppercase tracking-tight mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faUtensils} /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
             <button className="btn-primary !h-14 !text-[15px]" onClick={() => navigate('/waiter/restaurant')}>
                Take New Order
             </button>
             <button className="btn-secondary !h-14 !text-[15px]" onClick={() => navigate('/waiter/restaurant')}>
                View Active Orders
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
