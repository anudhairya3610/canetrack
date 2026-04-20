'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const VARIETIES = ['CO-0238', 'CO-0118', 'CO-0239', 'CoLk-94184'];

export default function NewPlotPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', areaBigha: '', variety: '', customVariety: '', plantingDate: '', status: 'growing',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.areaBigha || !form.plantingDate || (!form.variety && !form.customVariety)) {
      setError(t.common.required);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          areaBigha: form.areaBigha,
          variety: form.variety === 'custom' ? form.customVariety : form.variety,
          plantingDate: form.plantingDate,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/plots/${data.id}`);
      } else {
        setError(data.error || t.common.error);
      }
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/plots" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.plots.addPlot}</h1>
        </div>
        <LanguageToggle />
      </div>

      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="card">
            <div className="space-y-4">
              <div>
                <label className="input-label">{t.plots.plotName} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder={t.plots.plotNamePlaceholder}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">{t.plots.areaBigha} *</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.areaBigha}
                  onChange={e => set('areaBigha', e.target.value)}
                  placeholder={t.plots.areaBighaPlaceholder}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">{t.plots.variety} *</label>
                <div className="relative">
                  <select
                    value={form.variety}
                    onChange={e => set('variety', e.target.value)}
                    className="input-field appearance-none pr-10"
                    required={form.variety !== 'custom'}
                  >
                    <option value="">{t.plots.selectVariety}</option>
                    {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
                    <option value="custom">{t.plots.custom}</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              {form.variety === 'custom' && (
                <div>
                  <label className="input-label">{t.plots.custom} {t.plots.variety}</label>
                  <input
                    type="text"
                    value={form.customVariety}
                    onChange={e => set('customVariety', e.target.value)}
                    placeholder={t.plots.customVarietyPlaceholder}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div>
                <label className="input-label">{t.plots.plantingDate} *</label>
                <input
                  type="date"
                  value={form.plantingDate}
                  onChange={e => set('plantingDate', e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="input-label">{t.plots.status}</label>
                <div className="grid grid-cols-3 gap-2">
                  {['growing', 'harvesting', 'completed'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('status', s)}
                      className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: form.status === s ? 'var(--green-primary)' : 'var(--green-pale)',
                        color: form.status === s ? 'white' : 'var(--green-primary)',
                        border: `1.5px solid ${form.status === s ? 'var(--green-primary)' : 'var(--border-color)'}`,
                      }}
                    >
                      {s === 'growing' ? t.plots.growing : s === 'harvesting' ? t.plots.harvesting : t.plots.completed}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

          <div className="flex gap-3">
            <Link href="/plots" className="btn-secondary flex-shrink-0 w-auto px-6">{t.plots.cancel}</Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.plots.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
