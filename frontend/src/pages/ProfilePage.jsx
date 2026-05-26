import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import client from '../api/client';
import { notifySuccess, notifyError } from '../utils/notify.jsx';

export default function ProfilePage() {
  const [profile, setProfile] = useState({});
  const [editing, setEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // LOAD DATA
  useEffect(() => {
    client.get('/profile').then((res) => {
      setProfile(res.data);
      if (res.data.logo) setLogoPreview(res.data.logo);
    });
  }, []);

  // ✅ HANDLE SAVE & EDIT
  const handleEdit = async () => {
    setLoadingMessage('Loading settings...');
    setSubmitting(true);
    setEditing(true);
    setSubmitting(false);
  };

  const handleSave = async () => {
    setLoadingMessage('Saving changes...');
    if (profile.primaryContactNo && profile.primaryContactNo.length !== 10) {
      notifyError('Contact number must be 10 digits');
      return;
    }
    setSubmitting(true);
    try {
      await client.put('/profile', profile);
      notifySuccess('Profile updated successfully');
      setEditing(false);
    } catch (err) {
      notifyError('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ HANDLE LOGO UPLOAD
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setProfile({ ...profile, logo: reader.result }); // store base64
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader
        title="PROFILE MANAGEMENT"
        subtitle="Hotel Settings & Identity"
        actions={
          editing ? (
            <button className="btn-primary" onClick={handleSave} disabled={submitting}>
              {submitting && loadingMessage === 'Saving changes...' ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button className="btn-secondary" onClick={handleEdit} disabled={submitting}>
              {submitting && loadingMessage === 'Loading settings...' ? 'Loading...' : 'Edit Settings'}
            </button>
          )
        }
      />

      <div className="card relative p-6 md:p-8">
        {submitting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm">
            <div className="spinner"></div>
            <p className="text-[13px] font-semibold text-brand-muted">{loadingMessage}</p>
          </div>
        )}

        <div className={`transition-all duration-200 ${submitting ? 'pointer-events-none blur-[2px]' : ''}`}>
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">

            {/* LOGO SECTION */}
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-border bg-slate-50 p-4 text-center">

              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Hotel Logo"
                  className="mb-4 h-28 w-28 object-contain rounded-xl"
                />
              ) : (
                <div className="mb-4 text-brand-muted">Hotel Logo</div>
              )}

              {editing && (
                <label className="btn-secondary cursor-pointer">
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* FORM */}
            <div className="grid gap-6 md:grid-cols-2">

              <div>
                <label className="label">Official Hotel Name</label>
                <input
                  className="input"
                  disabled={!editing}
                  value={profile.officialHotelName || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, officialHotelName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Physical Address</label>
                <input
                  className="input"
                  disabled={!editing}
                  value={profile.physicalAddress || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, physicalAddress: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Primary Contact No</label>
                <input
                  className="input"
                  disabled={!editing}
                  value={profile.primaryContactNo || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, primaryContactNo: e.target.value })
                  }
                />
                {editing && profile.primaryContactNo && profile.primaryContactNo.length !== 10 && (
                  <p className="mt-1 text-[11px] text-rose-500 font-semibold italic">contact no must be 10 digits</p>
                )}
              </div>

              <div>
                <label className="label">PAN/VAT Number</label>
                <input
                  className="input"
                  disabled={!editing}
                  value={profile.panVatNumber || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, panVatNumber: e.target.value })
                  }
                />
              </div>
              
              <div>
                <label className="label">Official Email</label>
                <input
                  className="input"
                  disabled={!editing}
                  value={profile.email || ''}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* TEXTAREA */}
          <div className="mt-6">
            <label className="label">Welcome Message / Tagline</label>
            <textarea
              className="textarea min-h-28"
              disabled={!editing}
              value={profile.welcomeMessage || ''}
              onChange={(e) =>
                setProfile({ ...profile, welcomeMessage: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}