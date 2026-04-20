'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Sprout, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.auth.invalidCredentials);
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
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(165deg, #1b4332 0%, #2d6a4f 40%, #52b788 100%)',
      }}
    >
      {/* Header */}
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>

      {/* Logo Section */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.25)' }}
        >
          <Sprout size={42} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">{t.app.name}</h1>
        <p className="text-green-200 mt-1 text-base font-medium">{t.app.tagline}</p>
      </div>

      {/* Card */}
      <div
        className="flex-1 mx-4 rounded-t-3xl px-6 pt-8 pb-8"
        style={{ background: 'white', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)' }}
      >
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {t.auth.login}
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="input-label">{t.auth.name}</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.auth.namePlaceholder}
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">{t.auth.password}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="input-field pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : t.auth.loginBtn}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t.auth.noAccount}{' '}
          <Link href="/signup" className="font-bold" style={{ color: 'var(--green-primary)' }}>
            {t.auth.signupLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
