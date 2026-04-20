'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, MapPin, Sprout, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function SignupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', village: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError(t.auth.passwordMismatch); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, village: form.village, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'Name already taken' ? t.auth.nameExists : data.error);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(165deg, #1b4332 0%, #2d6a4f 40%, #52b788 100%)' }}>
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>

      <div className="flex flex-col items-center pt-6 pb-4 px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
          <Sprout size={34} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">{t.app.name}</h1>
        <p className="text-green-200 text-sm font-medium">{t.app.tagline}</p>
      </div>

      <div className="flex-1 mx-4 rounded-t-3xl px-6 pt-7 pb-8" style={{ background: 'white' }}>
        <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{t.auth.signup}</h2>

        <form onSubmit={handleSignup} className="space-y-4">
          {[
            { label: t.auth.name, key: 'name', Icon: User, placeholder: t.auth.namePlaceholder, type: 'text' },
            { label: t.auth.village, key: 'village', Icon: MapPin, placeholder: t.auth.villagePlaceholder, type: 'text' },
          ].map(({ label, key, Icon, placeholder, type }) => (
            <div key={key}>
              <label className="input-label">{label}</label>
              <div className="relative">
                <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>
          ))}

          <div>
            <label className="input-label">{t.auth.password}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="input-field pl-10 pr-10"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">{t.auth.confirmPassword}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => handleChange('confirm', e.target.value)}
                placeholder={t.auth.confirmPasswordPlaceholder}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : t.auth.signupBtn}
          </button>
        </form>

        <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="font-bold" style={{ color: 'var(--green-primary)' }}>{t.auth.loginLink}</Link>
        </p>
      </div>
    </div>
  );
}
