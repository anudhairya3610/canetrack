'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Wheat, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

interface HarvestEntry { id: string; date: string; quantityQtl: number; vehicleNumber?: string; tokenNumber?: string; millName?: string; plot: { name: string; areaBigha: number }; }
interface Plot { id: string; name: string; areaBigha: number; status: string; harvestEntries: { quantityQtl: number }[]; }

export default function HarvestPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plotId: '', date: new Date().toISOString().split('T')[0], quantityQtl: '', vehicleNumber: '', tokenNumber: '', millName: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch('/api/harvest').then(r => r.json()),
      fetch('/api/plots').then(r => r.json()),
    ]).then(([h, p]) => { setEntries(Array.isArray(h) ? h : []); setPlots(Array.isArray(p) ? p : []); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const totalYield = entries.reduce((s, e) => s + e.quantityQtl, 0);

  const plotYield = (plotId: string) => entries.filter(e => e.plot?.name === plots.find(p => p.id === plotId)?.name).reduce((s, e) => s + e.quantityQtl, 0);

  const save = async () => {
    if (!form.plotId || !form.quantityQtl) return;
    setSaving(true);
    await fetch('/api/harvest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setForm({ plotId: '', date: new Date().toISOString().split('T')[0], quantityQtl: '', vehicleNumber: '', tokenNumber: '', millName: '', notes: '' });
    fetchData();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.harvest.title}</h1>
          <p className="text-xs font-semibold" style={{ color: 'var(--green-primary)' }}>{t.harvest.totalYield}: {totalYield.toFixed(2)} {t.common.qtl}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => setShowForm(true)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>
      <div className="page-content">
        {/* Total summary */}
        <div className="card-highlight text-white mb-4">
          <p className="text-sm text-green-100">{t.harvest.totalYield}</p>
          <p className="text-4xl font-bold mt-1">{totalYield.toFixed(2)}</p>
          <p className="text-green-200 text-sm">{t.common.qtl}</p>
        </div>

        {showForm && (
          <div className="card mb-4 space-y-3 animate-fade-in" style={{ border: '2px solid var(--green-primary)' }}>
            <p className="font-bold">{t.harvest.addEntry}</p>
            <div className="relative">
              <select value={form.plotId} onChange={e => setForm(f => ({ ...f, plotId: e.target.value }))} className="input-field appearance-none pr-8">
                <option value="">Select plot *</option>
                {plots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
            <input type="number" step="0.1" value={form.quantityQtl} onChange={e => setForm(f => ({ ...f, quantityQtl: e.target.value }))} placeholder={`${t.harvest.quintals} *`} className="input-field" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder={t.harvest.vehicle} className="input-field py-2.5 text-sm" />
              <input type="text" value={form.tokenNumber} onChange={e => setForm(f => ({ ...f, tokenNumber: e.target.value }))} placeholder={t.harvest.token} className="input-field py-2.5 text-sm" />
            </div>
            <input type="text" value={form.millName} onChange={e => setForm(f => ({ ...f, millName: e.target.value }))} placeholder={t.harvest.mill} className="input-field" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
            </div>
          </div>
        )}

        {/* Plot-wise summary */}
        {plots.filter(p => p.harvestEntries?.length > 0 || entries.some(e => e.plot?.name === p.name)).length > 0 && (
          <div className="mb-4">
            <p className="section-title">{t.harvest.plotWise}</p>
            <div className="space-y-2">
              {plots.filter(p => p.status === 'harvesting' || p.status === 'completed').map(plot => {
                const yld = entries.filter(e => e.plot?.name === plot.name).reduce((s, e) => s + e.quantityQtl, 0);
                return (
                  <div key={plot.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
                        <Wheat size={20} style={{ color: 'var(--green-primary)' }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plot.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plot.areaBigha} {t.common.bigha}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: 'var(--green-primary)' }}>{yld.toFixed(1)} {t.common.qtl}</p>
                      {plot.status === 'completed' && <span className="badge badge-green text-xs">{t.plots.completed}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All entries */}
        <p className="section-title">Recent Entries</p>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-8">
            <Wheat size={36} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t.harvest.noHarvest}</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {entries.slice(0, 20).map(e => (
              <div key={e.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
                  <Wheat size={18} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{e.plot?.name}</p>
                    <p className="font-bold" style={{ color: 'var(--green-primary)' }}>{e.quantityQtl} {t.common.qtl}</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(e.date), 'dd MMM yyyy')}
                    {e.vehicleNumber && ` • ${e.vehicleNumber}`}
                    {e.millName && ` • ${e.millName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
