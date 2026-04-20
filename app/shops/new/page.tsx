'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const SHOP_TYPES = ['Fertilizer Shop', 'Pesticide Shop', 'Seed Shop', 'Hardware Shop', 'General Store', 'Machinery', 'Other'];

export default function NewShopPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ shopName: '', ownerName: '', phone: '', address: '', shopType: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName) { setError(t.common.required); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/shops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) router.push(`/shops/${data.id}`);
      else setError(data.error || t.common.error);
    } catch { setError(t.common.error); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/shops" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.shops.addShop}</h1>
        </div>
        <LanguageToggle />
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            {[
              { key: 'shopName', label: `${t.shops.shopName} *`, placeholder: 'e.g. Singh Fertilizers' },
              { key: 'ownerName', label: t.shops.ownerName, placeholder: 'Owner name' },
              { key: 'phone', label: t.shops.phone, placeholder: 'Phone number', type: 'tel' },
              { key: 'address', label: t.shops.address, placeholder: 'Address' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="input-label">{label}</label>
                <input type={type || 'text'} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className="input-field" required={key === 'shopName'} />
              </div>
            ))}
            <div>
              <label className="input-label">{t.shops.shopType}</label>
              <div className="relative">
                <select value={form.shopType} onChange={e => set('shopType', e.target.value)} className="input-field appearance-none pr-8">
                  <option value="">Select type</option>
                  {SHOP_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>
          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}
          <div className="flex gap-3">
            <Link href="/shops" className="btn-secondary flex-shrink-0 w-auto px-6">{t.common.cancel}</Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.shops.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
