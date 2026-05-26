import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faEye, faEyeSlash, faLock } from '@fortawesome/free-solid-svg-icons';
import { notifySuccess, notifyError } from '../utils/notify';

import client from '../api/client';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState('');
  const [hotelName, setHotelName] = useState('HOTEL NARVADA INN');

  // ✅ FETCH LOGO FROM BACKEND
  useEffect(() => {
    client.get('/profile/public')
      .then((res) => {
        if (res.data.logo) setLogo(res.data.logo);
        if (res.data.officialHotelName) setHotelName(res.data.officialHotelName);
      })
      .catch(() => { });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await onLogin(form);
      notifySuccess('Logged in successfully');
    } catch (error) {
      const msg = error.response?.data?.message;
      if (msg && msg.toLowerCase().includes('invalid')) {
        notifyError('Invalid login credentials');
      } else {
        notifyError(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-content-center bg-slate-100 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[800px] rounded-[22px] border border-brand-border bg-white px-7 py-8 shadow-soft sm:px-10"
      >
        {/* ✅ LOGO */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[20px] border border-brand-border bg-brand-soft overflow-hidden">
          {logo ? (
            <img
              src={logo}
              alt="Hotel Logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-[14px] font-extrabold text-brand-blue">
              HOTEL
            </span>
          )}
        </div>

        {/* TITLE */}
        <h1 className="text-center text-[22px] font-extrabold leading-tight text-brand-text sm:text-[24px]">
          {hotelName}
        </h1>

        <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-blue">
          Staff Access Portal
        </p>

        {/* FORM */}
        <div className="mt-9 space-y-5">

          {/* EMAIL */}
          <div>
            <label className="label">Email Address</label>

            <div className="flex h-[42px] items-center rounded-[12px] border border-brand-border bg-white px-3">
              <span className="mr-3 text-[13px] text-brand-muted">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-full w-full bg-transparent text-[15px] outline-none"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="label">Password</label>

            <div className="flex h-[42px] items-center rounded-[12px] border border-brand-border bg-white px-3">
              <span className="mr-3 text-[13px] text-brand-muted">
                <FontAwesomeIcon icon={faLock} />
              </span>

              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="h-full w-full bg-transparent text-[15px] outline-none"
                placeholder="Enter your password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="ml-2 text-[13px] text-brand-muted hover:text-brand-text"
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-[42px] w-full text-[15px] font-bold"
          >
            {loading ? 'LOGGING IN...' : 'LOG IN'}
          </button>
        </div>
      </form>
    </div>
  );
}