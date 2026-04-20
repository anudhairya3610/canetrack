'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { format } from 'date-fns';

interface WorkerRow {
  id: string; name: string; wageAmount: number; wageRateType: string;
  attendances: { status: string; dailyWage?: number; paidToday: boolean; paidAmount?: number }[];
  // local state
  _status: 'present' | 'absent' | 'halfday';
  _checkIn: string;
  _checkOut: string;
  _overtime: string;
  _overtimeRate: string;
  _paidToday: boolean;
  _paidAmount: string;
  _dailyWage: number;
}

export default function AttendancePage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const calcWage = (w: WorkerRow, status: string, overtime: string, overtimeRate: string) => {
    let base = 0;
    if (status === 'present') base = w.wageAmount;
    else if (status === 'halfday') base = w.wageAmount / 2;
    const ot = parseFloat(overtime) || 0;
    const otr = parseFloat(overtimeRate) || 0;
    return base + ot * otr;
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance?date=${date}`)
      .then(r => r.json())
      .then(data => {
        setWorkers(data.map((w: WorkerRow) => {
          const att = w.attendances?.[0];
          const status = (att?.status as 'present' | 'absent' | 'halfday') || 'absent';
          const overtime = String(att?.dailyWage || '');
          const overtimeRate = '0';
          return {
            ...w,
            _status: status,
            _checkIn: (att as any)?.checkIn || '',
            _checkOut: (att as any)?.checkOut || '',
            _overtime: '0',
            _overtimeRate: '0',
            _paidToday: att?.paidToday || false,
            _paidAmount: String(att?.paidAmount || ''),
            _dailyWage: att?.dailyWage || (status === 'present' ? w.wageAmount : status === 'halfday' ? w.wageAmount / 2 : 0),
          };
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  const update = (id: string, field: string, value: string | boolean) => {
    setWorkers(prev => prev.map(w => {
      if (w.id !== id) return w;
      const updated = { ...w, [field]: value };
      updated._dailyWage = calcWage(updated, updated._status, updated._overtime, updated._overtimeRate);
      return updated;
    }));
  };

  const setStatus = (id: string, status: 'present' | 'absent' | 'halfday') => {
    setWorkers(prev => prev.map(w => {
      if (w.id !== id) return w;
      const updated = { ...w, _status: status };
      updated._dailyWage = calcWage(updated, status, updated._overtime, updated._overtimeRate);
      return updated;
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    setWorkers(prev => prev.map(w => ({ ...w, _status: status, _dailyWage: calcWage(w, status, w._overtime, w._overtimeRate) })));
  };

  const save = async () => {
    setSaving(true);
    const records = workers.map(w => ({
      workerId: w.id,
      date,
      status: w._status,
      checkIn: w._checkIn || null,
      checkOut: w._checkOut || null,
      overtimeHours: parseFloat(w._overtime) || 0,
      overtimeRate: parseFloat(w._overtimeRate) || 0,
      dailyWage: w._dailyWage,
      paidToday: w._paidToday,
      paidAmount: parseFloat(w._paidAmount) || (w._paidToday ? w._dailyWage : 0),
    }));
    await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/workers" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.attendance.title}</h1>
        </div>
        <LanguageToggle />
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Date picker */}
        <div className="card flex items-center gap-3">
          <label className="input-label mb-0 flex-shrink-0">{t.attendance.date}:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field py-2" />
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <button onClick={() => markAll('present')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95" style={{ background: '#dcfce7', color: '#16a34a' }}>
            ✓ {t.attendance.markAllPresent}
          </button>
          <button onClick={() => markAll('absent')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95" style={{ background: '#fee2e2', color: '#dc2626' }}>
            ✗ {t.attendance.markAllAbsent}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl shimmer" />)}</div>
        ) : workers.length === 0 ? (
          <div className="card text-center py-8">
            <p style={{ color: 'var(--text-muted)' }}>{t.attendance.noWorkers}</p>
            <Link href="/workers/new" className="btn-primary mt-4" style={{ display: 'inline-flex', width: 'auto' }}>+ {t.workers.addWorker}</Link>
          </div>
        ) : (
          workers.map(w => (
            <div key={w.id} className="card space-y-3 animate-fade-in">
              {/* Name + status buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>₹{w.wageAmount}/{w.wageRateType}</p>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { key: 'present' as const, Icon: CheckCircle, color: '#16a34a', bg: '#dcfce7' },
                    { key: 'halfday' as const, Icon: Clock, color: '#d97706', bg: '#fef3c7' },
                    { key: 'absent' as const, Icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
                  ].map(({ key, Icon, color, bg }) => (
                    <button key={key} onClick={() => setStatus(w.id, key)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                      style={{ background: w._status === key ? bg : '#f8fbf8', border: `2px solid ${w._status === key ? color : 'var(--border-color)'}` }}>
                      <Icon size={16} style={{ color: w._status === key ? color : 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Times */}
              {w._status !== 'absent' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="input-label text-xs">{t.attendance.checkIn}</label>
                    <input type="time" value={w._checkIn} onChange={e => update(w.id, '_checkIn', e.target.value)} className="input-field py-2 text-sm" />
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.attendance.checkOut}</label>
                    <input type="time" value={w._checkOut} onChange={e => update(w.id, '_checkOut', e.target.value)} className="input-field py-2 text-sm" />
                  </div>
                </div>
              )}

              {/* Overtime */}
              {w._status !== 'absent' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="input-label text-xs">{t.attendance.overtime}</label>
                    <input type="number" step="0.5" value={w._overtime} onChange={e => update(w.id, '_overtime', e.target.value)} className="input-field py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="input-label text-xs">{t.attendance.overtimeRate} ₹/hr</label>
                    <input type="number" value={w._overtimeRate} onChange={e => update(w.id, '_overtimeRate', e.target.value)} className="input-field py-2 text-sm" placeholder="0" />
                  </div>
                </div>
              )}

              {/* Daily wage + paid */}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.attendance.dailyWage}</p>
                  <p className="font-bold text-lg" style={{ color: 'var(--green-primary)' }}>₹{w._dailyWage.toFixed(0)}</p>
                </div>
                <button
                  onClick={() => update(w.id, '_paidToday', !w._paidToday)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: w._paidToday ? '#2563eb' : 'var(--green-pale)', color: w._paidToday ? 'white' : 'var(--text-muted)', border: `2px solid ${w._paidToday ? '#2563eb' : 'var(--border-color)'}` }}
                >
                  {w._paidToday ? (
                    <><span className="double-tick">✓✓</span> {t.attendance.paidToday}</>
                  ) : (
                    <><Check size={14} /> {t.attendance.paidToday}</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Save button */}
        {!loading && workers.length > 0 && (
          <button onClick={save} disabled={saving} className="btn-primary py-4 sticky bottom-20">
            {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : saved ? <><CheckCircle size={18} /> Saved!</>
                : t.attendance.saveAttendance}
          </button>
        )}
      </div>
    </div>
  );
}
