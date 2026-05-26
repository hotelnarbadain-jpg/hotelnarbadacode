import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import client from './api/client';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import GuestPage from './pages/GuestPage';
import InventoryPage from './pages/InventoryPage';
import RestaurantPage from './pages/RestaurantPage';
import ProfilePage from './pages/ProfilePage';
import RoomPage from './pages/RoomPage';
import SahakariPage from './pages/SahakariPage';
import FinancialPage from './pages/FinancialPage';
import SalaryManagement from './pages/SalaryManagement';
import DeletionApprovalPage from './pages/DeletionApprovalPage';
import BillsManagementPage from './pages/BillsManagementPage';
import StockManagementPage from './pages/StockManagementPage';
import { notifySuccess } from './utils/notify.jsx';

// Import Reception Pages
import ReceptionDashboardPage from './pages/reception/ReceptionDashboardPage';
import ReceptionBookingManagement from './pages/reception/ReceptionBookingManagement';
import ReceptionGuestPage from './pages/reception/ReceptionGuestPage';
import ReceptionSahakariPage from './pages/reception/ReceptionSahakariPage';
import ReceptionRoomPage from './pages/reception/ReceptionRoomPage';
import ReceptionCheckoutPage from './pages/reception/ReceptionCheckoutPage';
import ReceptionDuesPage from './pages/reception/ReceptionDuesPage';
import MaintenancePage from './pages/reception/MaintenancePage';

// Import Housekeeping Pages
import HousekeepingDashboardPage from './pages/housekeeping/HousekeepingDashboardPage';
import HousekeepingRoomPage from './pages/housekeeping/HousekeepingRoomPage';

// Import Waiter Pages
import WaiterDashboardPage from './pages/waiter/WaiterDashboardPage';
import WaiterRestaurantPage from './pages/waiter/WaiterRestaurantPage';

const useAuthState = () => {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('hotelAuth') || 'null'));
  useEffect(() => {
    if (auth) localStorage.setItem('hotelAuth', JSON.stringify(auth));
    else localStorage.removeItem('hotelAuth');
  }, [auth]);
  return { auth, setAuth };
};

const ProtectedRoute = ({ auth, requiredRole, children }) => {
  if (!auth?.token) return <Navigate to="/login" replace />;
  if (requiredRole && auth.role !== requiredRole && auth.role !== 'Admin') {
    return <Navigate to={`/${auth.role.toLowerCase()}/dashboard`} replace />;
  }
  return children;
};

export default function App() {
  const { auth, setAuth } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const audioContext = useMemo(() => new (window.AudioContext || window.webkitAudioContext)(), []);

  // Unlock audio context on first interaction
  useEffect(() => {
    const unlock = () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed successfully');
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
        });
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [audioContext]);

  useEffect(() => {
    if (!auth?.token) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Extract origin to avoid "Invalid namespace" if URL has a path (e.g. /api)
    const socketBase = new URL(apiUrl).origin;
    
    const socket = io(socketBase, {
      withCredentials: true,
      // Removed restricted transports to allow polling fallback
    });
    
    socket.on('connect', () => console.log('Real-time notification socket connected:', socket.id));
    socket.on('connect_error', (err) => console.error('Socket connection error:', err));
    
    socket.on('db-update', () => {
      setUpdateTrigger((prev) => prev + 1);
    });

    socket.on('restaurant-notification', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev].slice(0, 50));
      
      // Ring ting ting 2 times (synthetic sound)
      const playSound = async () => {
        try {
          if (audioContext.state === 'suspended') await audioContext.resume();
          
          const playNote = (freq, time, duration) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(time);
            osc.stop(time + duration);
          };

          // Ting Ting
          playNote(1200, audioContext.currentTime, 0.2);
          playNote(1200, audioContext.currentTime + 0.25, 0.2);
        } catch (e) { console.error('Audio play failed', e); }
      };
      playSound();
    });

    return () => socket.disconnect();
  }, [auth?.token]);

  const api = useMemo(
    () => ({
      fetchList: async (endpoint) => (await client.get(endpoint)).data,
      getItem: async (endpoint, id) => (await client.get(`${endpoint}/${id}`)).data,
      createItem: async (endpoint, payload) => (await client.post(endpoint, payload)).data,
      updateItem: async (endpoint, id, payload) => (await client.put(`${endpoint}/${id}`, payload)).data,
      deleteItem: async (endpoint, id) => (await client.delete(`${endpoint}/${id}`)).data,
    }),
    []
  );

  const login = async (payload) => {
    const data = (await client.post('/auth/login', payload)).data;
    setAuth(data);
    navigate(`/${data.role.toLowerCase()}/dashboard`);
  };

  const logout = () => {
    setAuth(null);
    navigate('/login');
    notifySuccess('Logged out successfully');
  };

  const changeCredentials = async (payload) => {
    const data = (await client.put('/auth/credentials', payload)).data;
    setAuth(data);
  };

  useEffect(() => {
    if (!auth?.token && location.pathname !== '/login') navigate('/login');
  }, [auth, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={login} />} />
      <Route path="/" element={<Navigate to={auth ? `/${auth.role.toLowerCase()}/dashboard` : '/login'} replace />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute auth={auth} requiredRole="Admin">
            <Layout auth={auth} onLogout={logout} onChangeCredentials={changeCredentials} portal="Admin">
              <Routes>
                <Route path="dashboard" element={<DashboardPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="staff-management" element={<StaffPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="guest-management" element={<GuestPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="inventory-portal" element={<InventoryPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="restaurant" element={<RestaurantPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="profile-management" element={<ProfilePage />} />
                <Route path="room-management" element={<RoomPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="sahakari-management" element={<SahakariPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="financials" element={<FinancialPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="salary-management" element={<SalaryManagement api={api} updateTrigger={updateTrigger} />} />
                <Route path="deletion-approvals" element={<DeletionApprovalPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="bills-management" element={<BillsManagementPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="stock-management" element={<StockManagementPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* RECEPTION ROUTES */}
      <Route
        path="/reception/*"
        element={
          <ProtectedRoute auth={auth} requiredRole="Reception">
            <Layout auth={auth} onLogout={logout} onChangeCredentials={changeCredentials} portal="Reception" notifications={notifications} setNotifications={setNotifications}>
              <Routes>
                <Route path="dashboard" element={<ReceptionDashboardPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="booking-management" element={<ReceptionBookingManagement api={api} updateTrigger={updateTrigger} />} />
                <Route path="guest-management" element={<ReceptionGuestPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="checkout-management" element={<ReceptionCheckoutPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="dues-management" element={<ReceptionDuesPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="bills-management" element={<BillsManagementPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="room-management" element={<ReceptionRoomPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="inventory-portal" element={<InventoryPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="sahakari-management" element={<ReceptionSahakariPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="stock-management" element={<StockManagementPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="restaurant" element={<RestaurantPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="*" element={<Navigate to="/reception/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* HOUSEKEEPING ROUTES */}
      <Route
        path="/housekeeping/*"
        element={
          <ProtectedRoute auth={auth} requiredRole="Housekeeping">
            <Layout auth={auth} onLogout={logout} onChangeCredentials={changeCredentials} portal="Housekeeping" notifications={notifications} setNotifications={setNotifications}>
              <Routes>
                <Route path="dashboard" element={<HousekeepingDashboardPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="room-management" element={<HousekeepingRoomPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="*" element={<Navigate to="/housekeeping/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* WAITER ROUTES */}
      <Route
        path="/waiter/*"
        element={
          <ProtectedRoute auth={auth} requiredRole="Waiter">
            <Layout auth={auth} onLogout={logout} onChangeCredentials={changeCredentials} portal="Waiter" notifications={notifications} setNotifications={setNotifications}>
              <Routes>
                <Route path="dashboard" element={<WaiterDashboardPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="restaurant" element={<WaiterRestaurantPage api={api} updateTrigger={updateTrigger} />} />
                <Route path="*" element={<Navigate to="/waiter/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
