'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Layers, Plus, CheckCheck, AlertTriangle, Droplets, Activity, Camera, Bell, Wheat, DollarSign, Users, ChevronDown, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

type Tab = 'overview' | 'workers' | 'notes' | 'spray' | 'expenses' | 'activities' | 'harvest' | 'irrigation' | 'photos' | 'reminders';

interface PlotData {
  id: string; name: string; areaBigha: number; variety: string; plantingDate: string; status: string;
  photos: { id: string; imageUrl: string; caption?: string }[];
  notes: { id: string; noteType: string; content: string; date: string; images: { imageUrl: string }[] }[];
  sprayLogs: { id: string; sprayType: string; description?: string; cost?: number; date: string; images: { imageUrl: string }[] }[];
  expenses: { id: string; category: string; amount: number; description?: string; date: string }[];
  activities: { id: string; activityType: string; description?: string; date: string }[];
  harvestEntries: { id: string; quantityQtl: number; vehicleNumber?: string; tokenNumber?: string; millName?: string; date: string }[];
  irrigationLogs: { id: string; irrigationType: string; durationHours?: number; waterSource?: string; fuelCost?: number; electricityCost?: number; date: string }[];
  workerLogs: { id: string; workerId: string; workNote?: string; date: string; worker: { name: string } }[];
  reminders: { id: string; title: string; type: string; dueDate: string; isCompleted: boolean }[];
}

const TABS: { key: Tab; icon: React.ElementType; label: (t: ReturnType<typeof useLanguage>['t']) => string }[] = [
  { key: 'overview', icon: Layers, label: t => t.plotDetail.overview },
  { key: 'workers', icon: Users, label: t => t.plotDetail.todayWorkers },
  { key: 'notes', icon: AlertTriangle, label: t => t.plotDetail.notes },
  { key: 'spray', icon: Droplets, label: t => t.plotDetail.spray },
  { key: 'expenses', icon: DollarSign, label: t => t.plotDetail.expenses },
  { key: 'activities', icon: Activity, label: t => t.plotDetail.activities },
  { key: 'harvest', icon: Wheat, label: t => t.plotDetail.harvest },
  { key: 'irrigation', icon: Droplets, label: t => t.plotDetail.irrigation },
  { key: 'photos', icon: Camera, label: t => t.plotDetail.photos },
  { key: 'reminders', icon: Bell, label: t => t.plotDetail.reminders },
];

export default function PlotDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const plotId = params.id as string;
  const [plot, setPlot] = useState<PlotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Form states
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddSpray, setShowAddSpray] = useState(false);
  const [showAddHarvest, setShowAddHarvest] = useState(false);
  const [showAddIrrigation, setShowAddIrrigation] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [noteFilter, setNoteFilter] = useState<'all' | 'disease' | 'general'>('all');

  // Worker list for today tab
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);

  const fetchPlot = useCallback(() => {
    fetch(`/api/plots/${plotId}`)
      .then(r => r.json())
      .then(d => { setPlot(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [plotId]);

  useEffect(() => { fetchPlot(); }, [fetchPlot]);

  useEffect(() => {
    if (tab === 'workers') {
      fetch('/api/workers').then(r => r.json()).then(d => setWorkers(d.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name }))));
    }
  }, [tab]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-10 h-10 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" style={{ borderWidth: 3, borderColor: 'var(--green-pale)', borderTopColor: 'var(--green-primary)' }} />
    </div>
  );

  if (!plot) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
      <p style={{ color: 'var(--text-muted)' }}>Plot not found</p>
      <Link href="/plots" className="btn-primary" style={{ width: 'auto' }}>{t.common.back}</Link>
    </div>
  );

  const totalExpense = plot.expenses.reduce((s, e) => s + e.amount, 0);
  const totalYield = plot.harvestEntries.reduce((s, h) => s + h.quantityQtl, 0);
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayWorkers = plot.workerLogs.filter(l => l.date.startsWith(todayStr));

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/plots" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{plot.name}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plot.variety} • {plot.areaBigha} {t.common.bigha}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide" style={{ background: 'white', borderBottom: '1px solid var(--border-color)' }}>
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab-btn flex items-center gap-1.5 ${tab === key ? 'active' : ''}`}
          >
            <Icon size={14} />
            {label(t)}
          </button>
        ))}
      </div>

      <div className="page-content">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-3 animate-fade-in">
            <div className="card-highlight text-white">
              <p className="text-sm font-medium text-green-100 mb-3">{t.plotDetail.overview}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-green-200">{t.dashboard.totalExpense}</p>
                  <p className="text-xl font-bold">{fmt(totalExpense)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-200">{t.plotDetail.totalYield}</p>
                  <p className="text-xl font-bold">{totalYield.toFixed(1)} {t.common.qtl}</p>
                </div>
                <div>
                  <p className="text-xs text-green-200">{t.plotDetail.costPerBigha}</p>
                  <p className="text-lg font-bold">{fmt(plot.areaBigha > 0 ? totalExpense / plot.areaBigha : 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-green-200">{t.plotDetail.yieldPerBigha}</p>
                  <p className="text-lg font-bold">{(plot.areaBigha > 0 ? totalYield / plot.areaBigha : 0).toFixed(1)} {t.common.qtl}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.status}</p>
                  <p className="font-bold capitalize" style={{ color: 'var(--green-primary)' }}>{plot.status}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.areaBigha}</p>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{plot.areaBigha} {t.common.bigha}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.plantingDate}</p>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{format(new Date(plot.plantingDate), 'dd/MM/yy')}</p>
                </div>
              </div>
            </div>
            {/* Mark Completed */}
            {plot.status !== 'completed' && (
              <button
                onClick={async () => {
                  await fetch(`/api/plots/${plotId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
                  fetchPlot();
                }}
                className="w-full py-3 rounded-2xl font-semibold text-sm border-2 transition-all"
                style={{ borderColor: 'var(--earth-brown)', color: 'var(--earth-brown)', background: 'var(--earth-pale)' }}
              >
                ✅ {t.plotDetail.markCompleted}
              </button>
            )}
          </div>
        )}

        {/* TODAY WORKERS TAB */}
        {tab === 'workers' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddWorker(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addWorkerToday}
            </button>
            {showAddWorker && (
              <AddWorkerToPlotForm plotId={plotId} workers={workers} onClose={() => { setShowAddWorker(false); fetchPlot(); }} t={t} />
            )}
            {todayWorkers.length === 0 ? (
              <div className="card text-center py-8">
                <p style={{ color: 'var(--text-muted)' }}>{t.common.noData}</p>
              </div>
            ) : (
              todayWorkers.map(log => (
                <div key={log.id} className="card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
                    <Users size={20} style={{ color: 'var(--green-primary)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{log.worker?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.workNote || '—'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex gap-2 mb-3">
              {(['all', 'disease', 'general'] as const).map(f => (
                <button key={f} onClick={() => setNoteFilter(f)} className="tab-btn flex-1" style={{ flex: 1, textAlign: 'center', ...(noteFilter === f ? {} : {}) }}>
                  {f === 'all' ? 'All' : f === 'disease' ? t.plotDetail.disease : t.plotDetail.general}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddNote(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addNote}
            </button>
            {showAddNote && <AddNoteForm plotId={plotId} onClose={() => { setShowAddNote(false); fetchPlot(); }} t={t} />}
            {plot.notes.filter(n => noteFilter === 'all' || n.noteType === noteFilter).map(note => (
              <div key={note.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge" style={note.noteType === 'disease' ? { background: '#fee2e2', color: '#dc2626' } : { background: 'var(--green-pale)', color: 'var(--green-primary)' }}>
                    {note.noteType === 'disease' ? t.plotDetail.disease : t.plotDetail.general}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(note.date), 'dd MMM')}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* SPRAY TAB */}
        {tab === 'spray' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddSpray(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addSpray}
            </button>
            {showAddSpray && <AddSprayForm plotId={plotId} onClose={() => { setShowAddSpray(false); fetchPlot(); }} t={t} />}
            {plot.sprayLogs.map(sl => (
              <div key={sl.id} className="card">
                <div className="flex items-start justify-between mb-1.5">
                  <span className="badge" style={sl.sprayType === 'pesticide' ? { background: '#fee2e2', color: '#dc2626' } : { background: '#e0f2fe', color: '#0369a1' }}>
                    {sl.sprayType === 'pesticide' ? t.plotDetail.pesticide : t.plotDetail.fertilizer}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(sl.date), 'dd MMM')}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sl.description}</p>
                {sl.cost && <p className="text-sm font-bold mt-1" style={{ color: 'var(--green-primary)' }}>₹{sl.cost}</p>}
              </div>
            ))}
          </div>
        )}

        {/* EXPENSES TAB */}
        {tab === 'expenses' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">
              <Plus size={18} /> {t.expenses.addExpense}
            </button>
            {showAddExpense && <AddExpenseForm plotId={plotId} onClose={() => { setShowAddExpense(false); fetchPlot(); }} t={t} />}
            <div className="card">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.expenses.total}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-primary)' }}>{fmt(totalExpense)}</p>
            </div>
            {plot.expenses.map(exp => (
              <div key={exp.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--green-pale)' }}>
                  <DollarSign size={18} style={{ color: 'var(--green-primary)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-semibold capitalize text-sm" style={{ color: 'var(--text-primary)' }}>{exp.category}</p>
                    <p className="font-bold" style={{ color: '#dc2626' }}>₹{exp.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {exp.description} • {format(new Date(exp.date), 'dd MMM')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {tab === 'activities' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddActivity(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addActivity}
            </button>
            {showAddActivity && <AddActivityForm plotId={plotId} onClose={() => { setShowAddActivity(false); fetchPlot(); }} t={t} />}
            <div className="relative ml-4">
              <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: 'var(--border-color)' }} />
              {plot.activities.map(a => (
                <div key={a.id} className="relative pl-6 pb-4">
                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[3px]" style={{ background: 'var(--green-light)' }} />
                  <div className="card">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.activityType}</p>
                    {a.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.description}</p>}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(a.date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HARVEST TAB */}
        {tab === 'harvest' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddHarvest(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addHarvest}
            </button>
            {showAddHarvest && <AddHarvestForm plotId={plotId} onClose={() => { setShowAddHarvest(false); fetchPlot(); }} t={t} />}
            <div className="card-highlight text-white">
              <p className="text-sm text-green-100">{t.plotDetail.totalYield}</p>
              <p className="text-3xl font-bold mt-1">{totalYield.toFixed(2)} {t.common.qtl}</p>
              <p className="text-sm text-green-200 mt-1">{(plot.areaBigha > 0 ? totalYield / plot.areaBigha : 0).toFixed(2)} {t.common.qtl}/{t.common.bigha}</p>
            </div>
            {plot.harvestEntries.map(h => (
              <div key={h.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg" style={{ color: 'var(--green-primary)' }}>{h.quantityQtl} {t.common.qtl}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(h.date), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {h.vehicleNumber && <p>{t.plotDetail.vehicle}: {h.vehicleNumber}</p>}
                    {h.tokenNumber && <p>{t.plotDetail.token}: {h.tokenNumber}</p>}
                    {h.millName && <p>{h.millName}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* IRRIGATION TAB */}
        {tab === 'irrigation' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setShowAddIrrigation(true)} className="btn-primary">
              <Plus size={18} /> {t.plotDetail.addIrrigation}
            </button>
            {showAddIrrigation && <AddIrrigationForm plotId={plotId} onClose={() => { setShowAddIrrigation(false); fetchPlot(); }} t={t} />}
            {plot.irrigationLogs.map(il => (
              <div key={il.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{il.irrigationType}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {il.durationHours && `${il.durationHours}h`} {il.waterSource && `• ${il.waterSource}`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(il.date), 'dd MMM yyyy')}</p>
                  </div>
                  {(il.fuelCost || il.electricityCost) && (
                    <p className="font-bold text-sm" style={{ color: '#dc2626' }}>
                      ₹{((il.fuelCost || 0) + (il.electricityCost || 0)).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PHOTOS TAB */}
        {tab === 'photos' && (
          <div className="animate-fade-in">
            {plot.photos.length === 0 ? (
              <div className="card text-center py-12">
                <Camera size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>{t.common.noData}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {plot.photos.map(p => (
                  <div key={p.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                    <img src={p.imageUrl} alt={p.caption || ''} className="w-full h-32 object-cover" />
                    {p.caption && <p className="text-xs p-2" style={{ color: 'var(--text-muted)' }}>{p.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REMINDERS TAB */}
        {tab === 'reminders' && (
          <div className="space-y-3 animate-fade-in">
            {plot.reminders.length === 0 ? (
              <div className="card text-center py-8">
                <Bell size={36} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>{t.dashboard.noReminders}</p>
              </div>
            ) : (
              plot.reminders.filter(r => !r.isCompleted).map(r => (
                <div key={r.id} className="card flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--earth-pale)' }}>
                    <Bell size={18} style={{ color: 'var(--earth-brown)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(r.dueDate), 'dd MMM yyyy')}</p>
                    <span className="badge badge-yellow text-xs mt-1">{r.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

// ---- Sub-forms ----

function AddWorkerToPlotForm({ plotId, workers, onClose, t }: { plotId: string; workers: {id: string; name: string}[]; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const [workerId, setWorkerId] = useState('');
  const [workNote, setWorkNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!workerId) return;
    setSubmitting(true);
    await fetch('/api/plot-worker-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plotId, workerId, workNote, date: new Date().toISOString() }),
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <div className="relative">
        <select value={workerId} onChange={e => setWorkerId(e.target.value)} className="input-field appearance-none pr-8">
          <option value="">-- {t.workers.name} --</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
      <input type="text" value={workNote} onChange={e => setWorkNote(e.target.value)} placeholder={t.plotDetail.workNote} className="input-field" />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting || !workerId} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddNoteForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const [form, setForm] = useState({ noteType: 'general', content: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.content) return;
    setSubmitting(true);
    await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <div className="flex gap-2">
        {['general', 'disease'].map(nt => (
          <button key={nt} type="button" onClick={() => setForm(f => ({ ...f, noteType: nt }))}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: form.noteType === nt ? 'var(--green-primary)' : 'var(--green-pale)', color: form.noteType === nt ? 'white' : 'var(--green-primary)' }}>
            {nt === 'general' ? t.plotDetail.general : t.plotDetail.disease}
          </button>
        ))}
      </div>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={`${t.plotDetail.notes}...`} className="input-field" rows={3} />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddSprayForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const [form, setForm] = useState({ sprayType: 'pesticide', description: '', cost: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await fetch('/api/spray', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <div className="flex gap-2">
        {['pesticide', 'fertilizer'].map(st => (
          <button key={st} type="button" onClick={() => setForm(f => ({ ...f, sprayType: st }))}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: form.sprayType === st ? 'var(--green-primary)' : 'var(--green-pale)', color: form.sprayType === st ? 'white' : 'var(--green-primary)' }}>
            {st === 'pesticide' ? t.plotDetail.pesticide : t.plotDetail.fertilizer}
          </button>
        ))}
      </div>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.common.notes} className="input-field" />
      <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder={`${t.common.amount} (₹)`} className="input-field" />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddHarvestForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const [form, setForm] = useState({ quantityQtl: '', vehicleNumber: '', tokenNumber: '', millName: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.quantityQtl) return;
    setSubmitting(true);
    await fetch('/api/harvest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <input type="number" step="0.1" value={form.quantityQtl} onChange={e => setForm(f => ({ ...f, quantityQtl: e.target.value }))} placeholder={`${t.plotDetail.quintals} *`} className="input-field" required />
      <input type="text" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder={t.plotDetail.vehicle} className="input-field" />
      <input type="text" value={form.tokenNumber} onChange={e => setForm(f => ({ ...f, tokenNumber: e.target.value }))} placeholder={t.plotDetail.token} className="input-field" />
      <input type="text" value={form.millName} onChange={e => setForm(f => ({ ...f, millName: e.target.value }))} placeholder={t.plotDetail.millName} className="input-field" />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddIrrigationForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const [form, setForm] = useState({ irrigationType: '', durationHours: '', waterSource: '', fuelCost: '', electricityCost: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.irrigationType) return;
    setSubmitting(true);
    await fetch('/api/irrigation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <input type="text" value={form.irrigationType} onChange={e => setForm(f => ({ ...f, irrigationType: e.target.value }))} placeholder="Type (e.g. Flood, Drip) *" className="input-field" required />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.5" value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))} placeholder="Hours" className="input-field" />
        <input type="text" value={form.waterSource} onChange={e => setForm(f => ({ ...f, waterSource: e.target.value }))} placeholder="Water Source" className="input-field" />
        <input type="number" value={form.fuelCost} onChange={e => setForm(f => ({ ...f, fuelCost: e.target.value }))} placeholder="Fuel Cost ₹" className="input-field" />
        <input type="number" value={form.electricityCost} onChange={e => setForm(f => ({ ...f, electricityCost: e.target.value }))} placeholder="Electricity ₹" className="input-field" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddActivityForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const ACTIVITY_TYPES = ['Land Prep', 'Planting', 'Irrigation', 'Fertilizer', 'Pesticide', 'Weeding', 'Earthing Up', 'Other'];
  const [form, setForm] = useState({ activityType: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.activityType) return;
    setSubmitting(true);
    await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <div className="grid grid-cols-2 gap-2">
        {ACTIVITY_TYPES.map(at => (
          <button key={at} type="button" onClick={() => setForm(f => ({ ...f, activityType: at }))}
            className="py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: form.activityType === at ? 'var(--green-primary)' : 'var(--green-pale)', color: form.activityType === at ? 'white' : 'var(--green-primary)' }}>
            {at}
          </button>
        ))}
      </div>
      <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.common.notes} className="input-field" />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}

function AddExpenseForm({ plotId, onClose, t }: { plotId: string; onClose: () => void; t: ReturnType<typeof useLanguage>['t'] }) {
  const CATS = ['seed', 'fertilizer', 'pesticide', 'irrigation', 'machinery', 'labour', 'transport', 'rent', 'loanEmi', 'maintenance', 'misc'];
  const [form, setForm] = useState({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.category || !form.amount) return;
    setSubmitting(true);
    await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plotId, userId: '' }) });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
      <div className="relative">
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field appearance-none pr-8">
          <option value="">{t.expenses.category}</option>
          {CATS.map(c => <option key={c} value={c}>{t.expenses.categories[c as keyof typeof t.expenses.categories]}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
      <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={`${t.expenses.amount} *`} className="input-field" />
      <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.expenses.description} className="input-field" />
      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
        <button onClick={submit} disabled={submitting} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
      </div>
    </div>
  );
}
