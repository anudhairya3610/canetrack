'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Phone, IndianRupee, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

interface Worker {
  id: string; name: string; phone?: string; workerType: string; wageRateType: string; wageAmount: number; isActive: boolean;
  attendances: { status: string; paidToday: boolean; dailyWage?: number }[];
  advances: { amount: number; deducted: boolean }[];
  payments: { amount: number }[];
}

export default function WorkersPage() {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workers').then(r => r.json()).then(d => { setWorkers(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const todayStatus = (w: Worker) => {
    const att = w.attendances?.[0];
    if (!att) return null;
    return att.status;
  };

  const pendingDue = (w: Worker) => {
    const unpaidWages = w.attendances?.filter(a => !a.paidToday && a.status === 'present').reduce((s, a) => s + (a.dailyWage || 0), 0) || 0;
    const advances = w.advances?.filter(a => !a.deducted).reduce((s, a) => s + a.amount, 0) || 0;
    return unpaidWages + advances;
  };

  const wageLabel = (type: string) => {
    const map: Record<string, string> = {
      daily: t.workers.wageDaily,
      halfday: t.workers.wageHalfday,
      hourly: t.workers.wageHourly,
      task: t.workers.wageTask,
    };
    return map[type] || type;
  };

  const statusIcon = (status: string | null) => {
    if (status === 'present') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'absent') return <XCircle size={16} style={{ color: '#ef4444' }} />;
    if (status === 'halfday') return <Clock size={16} style={{ color: '#f59e0b' }} />;
    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.workers.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{workers.length} workers</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/workers/new" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </Link>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 py-3">
        <Link href="/workers/attendance" className="btn-primary py-3" style={{ display: 'flex', width: '100%' }}>
          <CheckCircle size={18} /> {t.attendance.title} — {t.workers.attendance}
        </Link>
      </div>

      <div className="page-content pt-0">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}</div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--green-pale)' }}>
              <Users size={40} style={{ color: 'var(--green-primary)' }} />
            </div>
            <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t.workers.noWorkers}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t.workers.addFirstWorker}</p>
            <Link href="/workers/new" className="btn-primary" style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              <Plus size={18} /> {t.workers.addWorker}
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {workers.map(w => {
              const status = todayStatus(w);
              const due = pendingDue(w);
              return (
                <Link key={w.id} href={`/workers/${w.id}`} className="card block active:scale-95 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))' }}>
                        {w.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
                        {w.phone && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Phone size={11} /> {w.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusIcon(status)}
                      <span className="badge badge-green text-xs">{w.workerType === 'permanent' ? t.workers.permanent : t.workers.daily}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ₹{w.wageAmount}/{wageLabel(w.wageRateType)}
                    </span>
                    {due > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#dc2626' }}>
                        <IndianRupee size={12} />
                        {t.workers.pendingDues}: ₹{due.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
