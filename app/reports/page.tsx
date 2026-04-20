'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';

interface PlotReport { id: string; name: string; areaBigha: number; variety: string; status: string; totalExpense: number; totalYield: number; costPerBigha: number; yieldPerBigha: number; }
interface LabourReport { id: string; name: string; totalEarned: number; totalPaid: number; totalAdvances: number; pendingDues: number; }

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#a05c04', '#d97706'];

export default function ReportsPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<{ plotReports: PlotReport[]; labourReports: LabourReport[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plots' | 'labour'>('plots');

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const totalExpense = data?.plotReports.reduce((s, p) => s + p.totalExpense, 0) || 0;
  const totalYield = data?.plotReports.reduce((s, p) => s + p.totalYield, 0) || 0;
  const totalPendingDues = data?.labourReports.reduce((s, l) => s + l.pendingDues, 0) || 0;

  const expenseByPlot = data?.plotReports.map(p => ({ name: p.name, expense: p.totalExpense })) || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.reports.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl shimmer" />)}</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4 animate-fade-in">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #2d6a4f, #40916c)', border: 'none' }}>
                <TrendingDown size={18} className="text-green-200" />
                <p className="text-xs text-green-200 mt-1">{t.reports.totalExpense}</p>
                <p className="text-lg font-bold text-white">{fmt(totalExpense)}</p>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #7c4d03, #a05c04)', border: 'none' }}>
                <TrendingUp size={18} className="text-amber-200" />
                <p className="text-xs text-amber-200 mt-1">Total Yield</p>
                <p className="text-lg font-bold text-white">{totalYield.toFixed(1)} {t.common.qtl}</p>
              </div>
              {totalPendingDues > 0 && (
                <div className="stat-card col-span-2" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                  <p className="text-xs font-medium" style={{ color: '#92400e' }}>Total Pending Labour Dues</p>
                  <p className="text-xl font-bold" style={{ color: '#7c4d03' }}>{fmt(totalPendingDues)}</p>
                </div>
              )}
            </div>

            {/* Tab selection */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab('plots')} className={`tab-btn flex-1 ${tab === 'plots' ? 'active' : ''}`}>{t.reports.plotPnl}</button>
              <button onClick={() => setTab('labour')} className={`tab-btn flex-1 ${tab === 'labour' ? 'active' : ''}`}>{t.reports.labour}</button>
            </div>

            {/* Plots tab */}
            {tab === 'plots' && (
              <div className="space-y-4 animate-fade-in">
                {expenseByPlot.length > 0 && (
                  <div className="card">
                    <p className="section-title text-sm">{t.reports.expenseCategory}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={expenseByPlot} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8aab8a' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                          formatter={(value) => {
                            const v = typeof value === 'number' ? value : 0;
                            return [`₹${v.toLocaleString('en-IN')}`, 'Expense'];
                          }}
                          contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }}
                        />
                        <Bar dataKey="expense" fill="#2d6a4f" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {data?.plotReports.map(plot => (
                  <div key={plot.id} className="card">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{plot.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plot.variety} • {plot.areaBigha} {t.common.bigha}</p>
                      </div>
                      <span className="badge badge-green capitalize">{plot.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [t.reports.totalExpense, fmt(plot.totalExpense), '#dc2626'],
                        ['Total Yield', `${plot.totalYield.toFixed(1)} ${t.common.qtl}`, 'var(--green-primary)'],
                        [t.plotDetail.costPerBigha, fmt(plot.costPerBigha), '#dc2626'],
                        [t.plotDetail.yieldPerBigha, `${plot.yieldPerBigha.toFixed(1)} ${t.common.qtl}`, 'var(--green-primary)'],
                      ].map(([label, value, color]) => (
                        <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          <p className="font-bold text-sm" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Labour tab */}
            {tab === 'labour' && (
              <div className="space-y-3 animate-fade-in">
                {data?.labourReports.map(w => (
                  <div key={w.id} className="card">
                    <p className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [t.workers.totalEarned, fmt(w.totalEarned), 'var(--text-primary)'],
                        [t.workers.totalPaid, fmt(w.totalPaid), '#16a34a'],
                        ['Advances', fmt(w.totalAdvances), '#d97706'],
                        [t.workers.balance, fmt(Math.abs(w.pendingDues)), w.pendingDues > 0 ? '#dc2626' : '#16a34a'],
                      ].map(([label, value, color]) => (
                        <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          <p className="font-bold text-sm" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
