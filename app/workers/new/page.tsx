'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function NewWorkerPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', phone: '', workerType: 'daily', wageRateType: 'daily', wageAmount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.wageAmount) { setError(t.common.required); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/workers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) router.push(`/workers/${data.id}`);
      else setError(data.error || t.common.error);
    } catch { setError(t.common.error); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/workers" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.workers.addWorker}</h1>
        </div>
        <LanguageToggle />
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div>
              <label className="input-label">{t.workers.name} *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t.workers.namePlaceholder} className="input-field" required />
            </div>
            <div>
              <label className="input-label">{t.workers.phone} {t.common.optional}</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t.workers.phonePlaceholder} className="input-field" />
            </div>
            <div>
              <label className="input-label">{t.workers.workerType}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['daily', t.workers.daily || 'Daily'],
                  ['monthly', t.workers.permanent || 'Monthly'],
                  ['contract', 'Contract'],
                  ['seasonal', 'Seasonal'],
                ].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => set('workerType', val)}
                    className="py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: form.workerType === val ? 'var(--green-primary)' : 'var(--green-pale)', color: form.workerType === val ? 'white' : 'var(--green-primary)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label">{t.workers.wageRateType}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['daily', t.workers.wageDaily || 'Daily'],
                  ['monthly', 'Monthly'],
                  ['perBigha', t.workers.wageTask || 'Per Bigha'],
                  ['perTask', 'Per Task'],
                ].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => set('wageRateType', val)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: form.wageRateType === val ? 'var(--green-primary)' : 'var(--green-pale)', color: form.wageRateType === val ? 'white' : 'var(--green-primary)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label">{t.workers.wageAmount} (₹) *</label>
              <input type="number" value={form.wageAmount} onChange={e => set('wageAmount', e.target.value)} placeholder="e.g. 450" className="input-field" required />
            </div>
          </div>
          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}
          <div className="flex gap-3">
            <Link href="/workers" className="btn-secondary flex-shrink-0 w-auto px-6">{t.common.cancel}</Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.workers.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}