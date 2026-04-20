'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const CATS = ['seed', 'fertilizer', 'pesticide', 'irrigation', 'machinery', 'labour', 'transport', 'rent', 'loanEmi', 'maintenance', 'misc'];

interface Plot { id: string; name: string; }
interface Shop { id: string; shopName: string; }

export default function AddExpensePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '', amount: '', description: '', plotId: '', shopId: '', isRecurring: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/plots').then(r => r.json()).then(d => setPlots(Array.isArray(d) ? d : []));
    fetch('/api/shops').then(r => r.json()).then(d => setShops(Array.isArray(d) ? d : []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount) { setError(t.common.required); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push('/expenses');
      else { const d = await res.json(); setError(d.error || t.common.error); }
    } catch { setError(t.common.error); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/expenses" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.expenses.addExpense}</h1>
        </div>
        <LanguageToggle />
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <div>
              <label className="input-label">{t.expenses.date}</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="input-label">{t.expenses.category} *</label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field appearance-none pr-8" required>
                  <option value="">{t.expenses.category}</option>
                  {CATS.map(c => <option key={c} value={c}>{t.expenses.categories[c as keyof typeof t.expenses.categories]}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div>
              <label className="input-label">{t.expenses.amount} (₹) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="input-field" required />
            </div>
            <div>
              <label className="input-label">{t.expenses.description} {t.common.optional}</label>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description" className="input-field" />
            </div>
            <div>
              <label className="input-label">{t.expenses.plot} {t.common.optional}</label>
              <div className="relative">
                <select value={form.plotId} onChange={e => set('plotId', e.target.value)} className="input-field appearance-none pr-8">
                  <option value="">{t.expenses.allPlots}</option>
                  {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            {shops.length > 0 && (
              <div>
                <label className="input-label">{t.expenses.shop} {t.common.optional}</label>
                <div className="relative">
                  <select value={form.shopId} onChange={e => set('shopId', e.target.value)} className="input-field appearance-none pr-8">
                    <option value="">Select shop</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.shopName}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={form.isRecurring} onChange={e => set('isRecurring', e.target.checked)} className="sr-only" />
                <div className="w-12 h-6 rounded-full transition-all" style={{ background: form.isRecurring ? 'var(--green-primary)' : '#d1d5db' }}>
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-all mt-0.5" style={{ marginLeft: form.isRecurring ? '26px' : '2px' }} />
                </div>
              </div>
              <span className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{t.expenses.recurring}</span>
            </label>
          </div>
          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}
          <div className="flex gap-3">
            <Link href="/expenses" className="btn-secondary flex-shrink-0 w-auto px-6">{t.common.cancel}</Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.expenses.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
