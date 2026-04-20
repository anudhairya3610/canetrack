'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, IndianRupee, Calendar, CheckCircle, XCircle, Clock, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface WorkerDetail {
  id: string; name: string; phone?: string; workerType: string; wageRateType: string; wageAmount: number; isActive: boolean;
  attendances: { id: string; date: string; status: string; paidToday: boolean; dailyWage: number; paidAmount?: number }[];
  payments: { id: string; amount: number; date: string; mode: string; notes?: string }[];
  advances: { id: string; amount: number; date: string; reason?: string; deducted: boolean }[];
}

export default function WorkerDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const workerId = params.id as string;
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdvModal, setShowAdvModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWorker = () => {
    fetch(`/api/workers/${workerId}`)
      .then(r => r.json())
      .then(d => { setWorker(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchWorker(); }, [workerId]);

  if (loading || !worker) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--green-pale)', borderTopColor: 'var(--green-primary)' }} />
    </div>
  );

  const monthDays = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });

  const getAtt = (day: Date) => worker.attendances.find(a => isSameDay(new Date(a.date), day));

  const totalEarned = worker.attendances.reduce((s, a) => s + (a.dailyWage || 0), 0);
  const totalPaid = worker.payments.reduce((s, p) => s + p.amount, 0) + worker.attendances.filter(a => a.paidToday).reduce((s, a) => s + (a.paidAmount || 0), 0);
  const totalAdvances = worker.advances.filter(a => !a.deducted).reduce((s, a) => s + a.amount, 0);
  const pendingDue = totalEarned - totalPaid + totalAdvances;

  const monthAtts = worker.attendances.filter(a => {
    const d = new Date(a.date);
    return d >= startOfMonth(viewMonth) && d <= endOfMonth(viewMonth);
  });
  const presentCount = monthAtts.filter(a => a.status === 'present').length;
  const absentCount = monthAtts.filter(a => a.status === 'absent').length;
  const halfdayCount = monthAtts.filter(a => a.status === 'halfday').length;

  const recordPayment = async () => {
    setSaving(true);
    await fetch('/api/payments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId, amount: payAmount, date: new Date().toISOString(), mode: 'cash' }),
    });
    setSaving(false); setShowPayModal(false); setPayAmount(''); fetchWorker();
  };

  const recordAdvance = async () => {
    setSaving(true);
    await fetch('/api/advances', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId, amount: advAmount, reason: advReason, date: new Date().toISOString() }),
    });
    setSaving(false); setShowAdvModal(false); setAdvAmount(''); setAdvReason(''); fetchWorker();
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/workers" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{worker.name}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{worker.workerType} • ₹{worker.wageAmount}/{worker.wageRateType}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary card */}
        <div className="card-highlight text-white">
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-xs text-green-200">{t.workers.totalEarned}</p><p className="text-lg font-bold">₹{totalEarned.toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-green-200">{t.workers.totalPaid}</p><p className="text-lg font-bold">₹{totalPaid.toLocaleString('en-IN')}</p></div>
            <div>
              <p className="text-xs text-green-200">{t.workers.balance}</p>
              <p className={`text-lg font-bold ${pendingDue > 0 ? 'text-yellow-300' : 'text-green-200'}`}>₹{Math.abs(pendingDue).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={() => setShowPayModal(true)} className="btn-primary flex-1 py-3 text-sm">
            <IndianRupee size={16} /> {t.workers.payNow}
          </button>
          <button onClick={() => setShowAdvModal(true)} className="btn-secondary flex-1 py-3 text-sm">
            <IndianRupee size={16} /> {t.workers.recordAdvance}
          </button>
        </div>

        {/* Pay modal */}
        {showPayModal && (
          <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
            <p className="font-bold">{t.workers.payNow}</p>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`₹ ${t.common.amount}`} className="input-field" />
            <div className="flex gap-2">
              <button onClick={() => setShowPayModal(false)} className="btn-secondary flex-1 py-2 text-sm">{t.common.cancel}</button>
              <button onClick={recordPayment} disabled={saving || !payAmount} className="btn-primary flex-1 py-2 text-sm">{t.common.save}</button>
            </div>
          </div>
        )}

        {/* Advance modal */}
        {showAdvModal && (
          <div className="card space-y-3" style={{ border: '2px solid var(--green-primary)' }}>
            <p className="font-bold">{t.workers.recordAdvance}</p>
            <input type="number" value={advAmount} onChange={e => setAdvAmount(e.target.value)} placeholder={`₹ ${t.common.amount}`} className="input-field" />
            <input type="text" value={advReason} onChange={e => setAdvReason(e.target.value)} placeholder={t.common.notes} className="input-field" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdvModal(false)} className="btn-secondary flex-1 py-2 text-sm">{t.common.cancel}</button>
              <button onClick={recordAdvance} disabled={saving || !advAmount} className="btn-primary flex-1 py-2 text-sm">{t.common.save}</button>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-pale)', color: 'var(--green-primary)' }}>‹</button>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{format(viewMonth, 'MMMM yyyy')}</p>
            <button onClick={() => setViewMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-pale)', color: 'var(--green-primary)' }}>›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before month start */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {monthDays.map(day => {
              const att = getAtt(day);
              let bg = 'transparent';
              let color = 'var(--text-muted)';
              if (att?.status === 'present') { bg = '#dcfce7'; color = '#16a34a'; }
              else if (att?.status === 'absent') { bg = '#fee2e2'; color = '#dc2626'; }
              else if (att?.status === 'halfday') { bg = '#fef3c7'; color = '#d97706'; }
              return (
                <div key={day.toISOString()} className="aspect-square flex flex-col items-center justify-center rounded-lg relative"
                  style={{ background: bg }}>
                  <span className="text-xs font-medium" style={{ color }}>{format(day, 'd')}</span>
                  {att?.paidToday && <span style={{ fontSize: 7, color: '#2563eb', fontWeight: 'bold' }}>✓✓</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-3 flex-wrap">
            {[['#dcfce7', '#16a34a', t.attendance.present], ['#fee2e2', '#dc2626', t.attendance.absent], ['#fef3c7', '#d97706', t.attendance.halfday]].map(([bg, c, label]) => (
              <span key={label} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="w-3 h-3 rounded" style={{ background: bg, border: `1px solid ${c}` }} />{label}
              </span>
            ))}
          </div>
        </div>

        {/* Monthly summary */}
        <div className="card">
          <p className="section-title text-sm mb-2">{t.workers.monthlySummary}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="py-2 rounded-xl" style={{ background: '#dcfce7' }}>
              <p className="text-xl font-bold" style={{ color: '#16a34a' }}>{presentCount}</p>
              <p className="text-xs" style={{ color: '#16a34a' }}>{t.workers.presentDays}</p>
            </div>
            <div className="py-2 rounded-xl" style={{ background: '#fee2e2' }}>
              <p className="text-xl font-bold" style={{ color: '#dc2626' }}>{absentCount}</p>
              <p className="text-xs" style={{ color: '#dc2626' }}>{t.workers.absentDays}</p>
            </div>
            <div className="py-2 rounded-xl" style={{ background: '#fef3c7' }}>
              <p className="text-xl font-bold" style={{ color: '#d97706' }}>{halfdayCount}</p>
              <p className="text-xs" style={{ color: '#d97706' }}>{t.workers.halfDays}</p>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {worker.payments.length > 0 && (
          <div className="card">
            <p className="section-title text-sm mb-2">{t.workers.paymentHistory}</p>
            <div className="space-y-2">
              {worker.payments.map(p => (
                <div key={p.id} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>₹{p.amount.toLocaleString('en-IN')}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.mode} • {format(new Date(p.date), 'dd MMM yyyy')}</p>
                  </div>
                  <Check size={16} style={{ color: '#16a34a' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advance history */}
        {worker.advances.length > 0 && (
          <div className="card">
            <p className="section-title text-sm mb-2">{t.workers.advanceHistory}</p>
            <div className="space-y-2">
              {worker.advances.map(a => (
                <div key={a.id} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>₹{a.amount.toLocaleString('en-IN')}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.reason || '—'} • {format(new Date(a.date), 'dd MMM')}</p>
                  </div>
                  <span className="badge" style={a.deducted ? { background: '#dcfce7', color: '#16a34a' } : { background: '#fee2e2', color: '#dc2626' }}>
                    {a.deducted ? 'Deducted' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
