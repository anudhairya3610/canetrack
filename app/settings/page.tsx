'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, MapPin, Globe, LogOut, Save, ChevronRight,
  Sprout, Shield, Info, AlertCircle, CheckCircle
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

interface UserProfile {
  name: string;
  village: string;
  language: string;
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ name: '', village: '', language: 'hi' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setEditName(d.name);
        setEditVillage(d.village);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editVillage.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), village: editVillage.trim() }),
      });
      if (res.ok) {
        setProfile(p => ({ ...p, name: editName.trim(), village: editVillage.trim() }));
        showToast('success', t.settings.save + '!');
      } else {
        const d = await res.json();
        showToast('error', d.error || t.common.error);
      }
    } catch {
      showToast('error', t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setLanguage(lang);
  };

  const isDirty = editName !== profile.name || editVillage !== profile.village;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.settings.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.app.tagline}</p>
        </div>
        <LanguageToggle />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg animate-fade-in"
          style={{
            background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toast.type === 'success' ? '#15803d' : '#dc2626',
            border: `1.5px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
            maxWidth: '90%',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="page-content">
        {loading ? (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
          </div>
        ) : (
          <>
            {/* Profile Avatar Card */}
            <div className="card-highlight text-white mb-4 animate-fade-in">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}
                >
                  {profile.name?.[0]?.toUpperCase() || <Sprout size={28} />}
                </div>
                <div>
                  <p className="font-bold text-lg">{profile.name}</p>
                  <p className="text-green-200 text-sm flex items-center gap-1">
                    <MapPin size={12} /> {profile.village}
                  </p>
                  <span
                    className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <Shield size={10} /> {t.common.save === 'Save' ? 'Farmer' : 'किसान'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Edit Section */}
            <div className="card mb-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <p className="section-title text-base">{t.settings.profile}</p>

              <div className="space-y-4">
                <div>
                  <label className="input-label flex items-center gap-1">
                    <User size={13} /> {t.settings.name}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="input-field"
                    placeholder={t.auth.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="input-label flex items-center gap-1">
                    <MapPin size={13} /> {t.settings.village}
                  </label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={e => setEditVillage(e.target.value)}
                    className="input-field"
                    placeholder={t.auth.villagePlaceholder}
                  />
                </div>
                {isDirty && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t.common.loading}
                      </span>
                    ) : (
                      <>
                        <Save size={18} />
                        {t.settings.save}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Language Section */}
            <div className="card mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <p className="section-title text-base flex items-center gap-2">
                <Globe size={18} style={{ color: 'var(--green-primary)' }} />
                {t.settings.language}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLanguageChange('hi')}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: language === 'hi' ? 'var(--green-primary)' : 'var(--bg-primary)',
                    color: language === 'hi' ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${language === 'hi' ? 'var(--green-primary)' : 'var(--border-color)'}`,
                    boxShadow: language === 'hi' ? '0 4px 12px rgba(45,106,79,0.3)' : 'none',
                  }}
                >
                  🇮🇳 {t.settings.hindi}
                  {language === 'hi' && <CheckCircle size={14} />}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: language === 'en' ? 'var(--green-primary)' : 'var(--bg-primary)',
                    color: language === 'en' ? 'white' : 'var(--text-secondary)',
                    border: `2px solid ${language === 'en' ? 'var(--green-primary)' : 'var(--border-color)'}`,
                    boxShadow: language === 'en' ? '0 4px 12px rgba(45,106,79,0.3)' : 'none',
                  }}
                >
                  🇬🇧 {t.settings.english}
                  {language === 'en' && <CheckCircle size={14} />}
                </button>
              </div>
            </div>

            {/* App Info */}
            <div className="card mb-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center gap-3 py-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--green-pale)' }}
                >
                  <Info size={18} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.app.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.app.tagline} • v1.0.0</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Logout */}
            {!logoutConfirm ? (
              <button
                onClick={() => setLogoutConfirm(true)}
                className="card w-full flex items-center gap-3 transition-all active:scale-95 animate-fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#fee2e2' }}
                >
                  <LogOut size={18} style={{ color: '#dc2626' }} />
                </div>
                <span className="font-semibold text-sm flex-1 text-left" style={{ color: '#dc2626' }}>
                  {t.settings.logout}
                </span>
                <ChevronRight size={16} style={{ color: '#fca5a5' }} />
              </button>
            ) : (
              <div className="card animate-fade-in" style={{ borderColor: '#fca5a5' }}>
                <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
                  {t.settings.logoutConfirm}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLogoutConfirm(false)}
                    className="py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '2px solid var(--border-color)' }}
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all text-white"
                    style={{ background: '#dc2626', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
                  >
                    {t.settings.logout}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
