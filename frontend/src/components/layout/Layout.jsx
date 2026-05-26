import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faBed, faBellConcierge, faCalendarDays, faChartLine, faChartPie, faChevronDown, faCircleUser,
  faClock, faGaugeHigh, faRightFromBracket, faUserGroup, faUsers, faWarehouse, faWallet, faXmark,
  faKey, faBookOpen, faMoneyCheckDollar, faFileInvoiceDollar, faMoneyBillWave, faBell
} from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'react-router-dom';
import Modal from '../common/Modal';
import PasswordInput from '../common/PasswordInput';
import ConfirmDialog from '../common/ConfirmDialog';
import { notifySuccess, notifyError } from '../../utils/notify';

const adminNavItems = [
  ['Dashboard', '/admin/dashboard', faGaugeHigh],
  ['Staff Management', '/admin/staff-management', faUsers],
  ['Room Management', '/admin/room-management', faBed],
  ['Guest Management', '/admin/guest-management', faUserGroup],
  ['Inventory Portal', '/admin/inventory-portal', faWarehouse],
  ['Stock Management', '/admin/stock-management', faChartPie],
  ['Sahakari Management', '/admin/sahakari-management', faWallet],
  ['Profile Management', '/admin/profile-management', faCircleUser],
  ['Restaurant', '/admin/restaurant', faBellConcierge],
  ['Financials', '/admin/financials', faChartLine],
  ['Salary Management', '/admin/salary-management', faMoneyBillWave],
  ['Bills Management', '/admin/bills-management', faFileInvoiceDollar],
  ['Deletion Approvals', '/admin/deletion-approvals', faUserGroup],
];

const receptionNavItems = [
  ['Dashboard', '/reception/dashboard', faGaugeHigh],
  ['Booking Management', '/reception/booking-management', faBookOpen],
  ['Guest Management', '/reception/guest-management', faUserGroup],
  ['Sahakari Management', '/reception/sahakari-management', faWallet],
  ['Checkout Management', '/reception/checkout-management', faMoneyCheckDollar],
  ['Dues Management', '/reception/dues-management', faWallet],
  ['Bills Management', '/reception/bills-management', faFileInvoiceDollar],
  ['Room Management', '/reception/room-management', faBed],
  ['Inventory Portal', '/reception/inventory-portal', faWarehouse],
  ['Stock Management', '/reception/stock-management', faChartPie],
  ['Restaurant', '/reception/restaurant', faBellConcierge],
];

const housekeepingNavItems = [
  ['Dashboard', '/housekeeping/dashboard', faGaugeHigh],
  ['Room Management', '/housekeeping/room-management', faBed],
];

const waiterNavItems = [
  ['Dashboard', '/waiter/dashboard', faGaugeHigh],
  ['Restaurant', '/waiter/restaurant', faBellConcierge],
];

const formatDate = (date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export default function Layout({ children, auth, onLogout, onChangeCredentials, portal, notifications = [], setNotifications }) {
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [credentialForm, setCredentialForm] = useState({
    fullName: auth?.name || '',
    email: auth?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    setCredentialForm((prev) => ({
      ...prev,
      fullName: auth?.name || '',
      email: auth?.email || '',
    }));
  }, [auth?.name, auth?.email]);

  useEffect(() => {
    const handleClick = (event) => {
      const isProfileClick = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isNotifClick = notifRef.current && notifRef.current.contains(event.target);
      
      if (!isProfileClick) setProfileOpen(false);
      if (!isNotifClick) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotifOpen(v => !v);
  };

  const clearAllNotifications = (e) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const navItems = portal === 'Admin' ? adminNavItems : portal === 'Reception' ? receptionNavItems : portal === 'Waiter' ? waiterNavItems : housekeepingNavItems;

  const title = useMemo(
    () => navItems.find(([_, path]) => location.pathname === path)?.[0] || 'Dashboard',
    [location.pathname, navItems]
  );

  const handleCredentialSubmit = async (event) => {
    event.preventDefault();
    if (credentialForm.newPassword && credentialForm.newPassword.length < 6) return notifyError('Password must be at least 6 characters long');
    if (credentialForm.newPassword !== credentialForm.confirmPassword) return notifyError('Passwords do not match');

    const payload = {
      name: credentialForm.fullName,
      email: credentialForm.email,
      currentPassword: credentialForm.currentPassword,
      newPassword: credentialForm.newPassword,
      confirmPassword: credentialForm.confirmPassword,
    };

    setSubmitting(true);
    try {
      await onChangeCredentials(payload);
      setCredentialOpen(false);
      notifySuccess('Credentials updated successfully');
      setCredentialForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg && msg.toLowerCase().includes('incorrect')) notifyError('The current password is incorrect');
      else notifyError(msg || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sidebar = (
    <aside className={`flex h-full flex-col bg-brand-navy text-white transition-all duration-300 ${collapsed ? 'w-[80px]' : 'w-[255px]'}`}>
      <div className={`flex items-center border-b border-white/10 py-5 transition-all ${collapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
        {!collapsed && (
          <div>
            <h1 className="text-[16px] font-extrabold whitespace-nowrap">NARVADA INN</h1>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.1em] text-blue-200">
              {portal.toUpperCase()} PANEL
            </p>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="grid h-10 w-10 place-content-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className={`hamburger-box ${collapsed ? 'open' : ''}`}>
            <div className="hamburger-line line-1"></div>
            <div className="hamburger-line line-2"></div>
            <div className="hamburger-line line-3"></div>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-6 overflow-x-hidden">
        {navItems.map(([label, path, icon]) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : ""}
              className={`nav-pill flex items-center gap-4 ${active ? 'bg-brand-blue text-white shadow-soft' : 'text-slate-100 hover:bg-white/5'} ${collapsed ? 'justify-center px-0 h-12 w-12 mx-auto rounded-xl' : 'px-4'}`}
            >
              <FontAwesomeIcon icon={icon} className="shrink-0 w-4" />
              {!collapsed && <span className="whitespace-nowrap transition-opacity duration-300">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button 
          onClick={() => setShowLogoutConfirm(true)} 
          className={`flex h-12 items-center justify-center gap-3 rounded-2xl bg-rose-950/30 text-[13px] font-semibold text-rose-300 hover:bg-rose-900/40 transition-all ${collapsed ? 'w-12 mx-auto' : 'w-full px-4'}`}
          title="Logout"
        >
          <FontAwesomeIcon icon={faRightFromBracket} /> 
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f4f6fb] overflow-x-hidden">
      <div className="lg:hidden">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-border bg-white px-4 py-4">
          <div>
            <h1 className="text-[18px] font-extrabold">HOTEL NARVADA INN</h1>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-brand-muted">{portal.toUpperCase()} PANEL</p>
          </div>
          <button className="btn-secondary !h-10 !px-3" onClick={() => setMobileOpen(true)}>
            <div className={`hamburger-box !w-4 !h-3 ${mobileOpen ? 'open' : ''}`}>
              <div className="hamburger-line !bg-brand-text line-1"></div>
              <div className="hamburger-line !bg-brand-text line-2"></div>
              <div className="hamburger-line !bg-brand-text line-3"></div>
            </div>
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/40">
            <div className="absolute inset-y-0 left-0">{sidebar}</div>
            <button className="absolute right-4 top-4 grid h-10 w-10 place-content-center rounded-full bg-white" onClick={() => setMobileOpen(false)}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
      </div>

      <div className="flex h-screen overflow-hidden">
        <div className="hidden h-full lg:block shrink-0">{sidebar}</div>
        <main className="min-w-0 flex-1 h-full overflow-y-auto">
          <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-brand-border bg-white px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[18px] font-extrabold md:text-[20px]">{title}</h2>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.18em] text-brand-muted">HOTEL NARVADA INN</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-[13px] font-medium">
                <FontAwesomeIcon icon={faCalendarDays} className="mr-2 text-brand-blue" />
                {formatDate(now)}
              </div>
              <div className="rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-[13px] font-medium">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-brand-blue" />
                {now.toLocaleTimeString()}
              </div>

              {/* Notification Bell */}
              {portal === 'Reception' && (
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={markAllRead}
                    className={`grid h-12 w-12 place-content-center rounded-2xl border border-brand-border transition-all ${unreadCount > 0 ? 'bg-brand-blue text-white shadow-soft' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                  >
                    <FontAwesomeIcon icon={faBell} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 border-2 border-white text-[10px] font-black flex items-center justify-center text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-80 rounded-2xl border border-brand-border bg-white shadow-xl overflow-hidden">
                      <div className="bg-slate-50 p-4 border-b border-brand-border flex justify-between items-center">
                        <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Notifications</h4>
                        <div className="flex gap-3">
                          {notifications.length > 0 && (
                            <button onClick={clearAllNotifications} className="text-[10px] font-bold text-rose-500 hover:underline">Clear All</button>
                          )}
                          <span className="text-[10px] font-bold text-brand-muted">{notifications.length} Total</span>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center opacity-40">
                            <FontAwesomeIcon icon={faBell} className="text-[32px] mb-2" />
                            <p className="text-[12px] font-bold">No new notifications</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-4 border-b border-brand-border last:border-0 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight ${
                                  n.type === 'CREATED' ? 'bg-green-100 text-green-700' : 
                                  n.type === 'UPDATED' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-rose-100 text-rose-700'
                                }`}>
                                  {n.type}
                                </span>
                                <span className="text-[9px] text-brand-muted">{new Date(n.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[12px] font-medium text-slate-700 leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-4 py-2 shadow-soft">
                  <div className="grid h-11 w-11 place-content-center rounded-full bg-brand-blue text-white">
                    <FontAwesomeIcon icon={faCircleUser} />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-bold uppercase">{auth?.name || 'User'}</p>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-brand-blue">{portal.toUpperCase()}</p>
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-56 rounded-2xl border border-brand-border bg-white p-2 shadow-soft">
                    <button onClick={() => { setCredentialOpen(true); setProfileOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50">
                      <FontAwesomeIcon icon={faKey} /> Change Password
                    </button>
                    <button onClick={() => setShowLogoutConfirm(true)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-rose-600 hover:bg-rose-50">
                      <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <section className="p-4 md:p-6 lg:p-8">{children}</section>
        </main>
      </div>

      <Modal open={credentialOpen} title="Change Credentials" onClose={() => !submitting && setCredentialOpen(false)} width="640px">
        <div className="relative">
          {submitting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="spinner"></div><p className="text-[13px] font-semibold text-brand-muted">Updating credentials...</p>
            </div>
          )}
          <form className={`grid gap-4 md:grid-cols-2 transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`} onSubmit={handleCredentialSubmit}>
            <div className="md:col-span-2"><label className="label">Full Name</label><input className="input" value={credentialForm.fullName} onChange={(e) => setCredentialForm({ ...credentialForm, fullName: e.target.value })} required /></div>
            <div className="md:col-span-2"><label className="label">Email</label><input className="input" type="email" value={credentialForm.email} onChange={(e) => setCredentialForm({ ...credentialForm, email: e.target.value })} required /></div>
            <div className="md:col-span-2"><label className="label">Current Password</label><PasswordInput value={credentialForm.currentPassword} onChange={(e) => setCredentialForm({ ...credentialForm, currentPassword: e.target.value })} required /></div>
            <div><label className="label">New Password</label><PasswordInput value={credentialForm.newPassword} onChange={(e) => setCredentialForm({ ...credentialForm, newPassword: e.target.value })} /></div>
            <div><label className="label">Confirm Password</label><PasswordInput value={credentialForm.confirmPassword} onChange={(e) => setCredentialForm({ ...credentialForm, confirmPassword: e.target.value })} /></div>
            <div className="md:col-span-2 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setCredentialOpen(false)} disabled={submitting}>Cancel</button><button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button></div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out of the system? Any unsaved changes may be lost."
        confirmText="Logout"
        confirmClass="btn-danger"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
      />
    </div>
  );
}