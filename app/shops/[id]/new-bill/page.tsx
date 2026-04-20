'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

interface BillItem { category: string; itemName: string; quantity: string; unit: string; pricePerUnit: string; totalPrice: number; }
interface Plot { id: string; name: string; }

const CATS = ['Seed', 'Fertilizer', 'Pesticide', 'Equipment', 'Other'];
const UNITS = ['Bag', 'Kg', 'Litre', 'Piece', 'Box', 'Quintal'];

export default function NewBillPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const shopId = params.id as string;
  const [plots, setPlots] = useState<Plot[]>([]);
  const [form, setForm] = useState({ billNumber: '', date: new Date().toISOString().split('T')[0], plotId: '', discount: '0', paymentStatus: 'credit', paidAmount: '0' });
  const [items, setItems] = useState<BillItem[]>([{ category: '', itemName: '', quantity: '1', unit: 'Bag', pricePerUnit: '', totalPrice: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/plots').then(r => r.json()).then(d => setPlots(Array.isArray(d) ? d : []));
  }, []);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const updateItem = (i: number, k: string, v: string) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [k]: v };
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.pricePerUnit) || 0;
      updated.totalPrice = qty * price;
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, { category: '', itemName: '', quantity: '1', unit: 'Bag', pricePerUnit: '', totalPrice: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);
  const discount = parseFloat(form.discount) || 0;
  const finalAmount = Math.max(0, subtotal - discount);
  const dueAmount = form.paymentStatus === 'paid' ? 0 : finalAmount - (parseFloat(form.paidAmount) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(it => !it.itemName || !it.pricePerUnit)) { setError('All items need name and price'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/bills`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map(it => ({ ...it, quantity: parseFloat(it.quantity) || 1, pricePerUnit: parseFloat(it.pricePerUnit) || 0, totalPrice: it.totalPrice })),
          finalAmount, discount, dueAmount,
          paidAmount: form.paymentStatus === 'paid' ? finalAmount : (parseFloat(form.paidAmount) || 0),
        }),
      });
      if (res.ok) router.push(`/shops/${shopId}`);
      else { const d = await res.json(); setError(d.error || t.common.error); }
    } catch { setError(t.common.error); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href={`/shops/${shopId}`} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.shops.addBill}</h1>
        </div>
        <LanguageToggle />
      </div>
      <div className="page-content">
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
          {/* Bill info */}
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">{t.shops.billNumber}</label>
                <input type="text" value={form.billNumber} onChange={e => setF('billNumber', e.target.value)} placeholder="Bill no." className="input-field" />
              </div>
              <div>
                <label className="input-label">{t.common.date}</label>
                <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className="input-field" required />
              </div>
            </div>
            {plots.length > 0 && (
              <div>
                <label className="input-label">{t.plots.title} {t.common.optional}</label>
                <div className="relative">
                  <select value={form.plotId} onChange={e => setF('plotId', e.target.value)} className="input-field appearance-none pr-8">
                    <option value="">Select plot</option>
                    {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="section-title">Items</p>
            {items.map((item, idx) => (
              <div key={idx} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="btn-danger py-1 px-2">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="input-label text-xs">{t.shops.itemName} *</label>
                    <input type="text" value={item.itemName} onChange={e => updateItem(idx, 'itemName', e.target.value)} placeholder="Item name" className="input-field py-2.5 text-sm" required />
                  </div>
                  <div>
                    <label className="input-label text-xs">Category</label>
                    <div className="relative">
                      <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} className="input-field appearance-none pr-6 py-2.5 text-sm">
                        <option value="">Category</option>
                        {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.shops.quantity}</label>
                    <input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="input-field py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.shops.unit}</label>
                    <div className="relative">
                      <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="input-field appearance-none pr-6 py-2.5 text-sm">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.shops.pricePerUnit} ₹</label>
                    <input type="number" step="0.01" value={item.pricePerUnit} onChange={e => updateItem(idx, 'pricePerUnit', e.target.value)} placeholder="0" className="input-field py-2.5 text-sm" required />
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.shops.totalPrice}</label>
                    <p className="input-field py-2.5 text-sm font-bold" style={{ color: 'var(--green-primary)', background: 'var(--green-pale)' }}>₹{item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn-secondary py-2.5">
              <Plus size={16} /> {t.shops.addItem}
            </button>
          </div>

          {/* Totals */}
          <div className="card space-y-3">
            <div className="flex justify-between text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div>
              <label className="input-label">{t.shops.discount} ₹</label>
              <input type="number" step="0.01" value={form.discount} onChange={e => setF('discount', e.target.value)} className="input-field" placeholder="0" />
            </div>
            <div className="flex justify-between text-lg font-bold p-3 rounded-xl" style={{ background: 'var(--green-pale)', color: 'var(--green-primary)' }}>
              <span>Final Amount</span><span>₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment status */}
          <div className="card space-y-3">
            <label className="input-label">{t.shops.paymentStatus}</label>
            <div className="grid grid-cols-3 gap-2">
              {[['paid', t.shops.paid], ['partial', t.shops.partial], ['credit', t.shops.credit]].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setF('paymentStatus', val)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: form.paymentStatus === val ? 'var(--green-primary)' : 'var(--green-pale)', color: form.paymentStatus === val ? 'white' : 'var(--green-primary)' }}>
                  {label}
                </button>
              ))}
            </div>
            {form.paymentStatus === 'partial' && (
              <div>
                <label className="input-label">{t.shops.amountPaid} ₹</label>
                <input type="number" step="0.01" value={form.paidAmount} onChange={e => setF('paidAmount', e.target.value)} placeholder="Amount paid" className="input-field" />
              </div>
            )}
          </div>

          {error && <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}
          <div className="flex gap-3">
            <Link href={`/shops/${shopId}`} className="btn-secondary flex-shrink-0 w-auto px-6">{t.common.cancel}</Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.shops.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
