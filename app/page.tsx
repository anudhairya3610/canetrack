'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Layers, AlertCircle, Plus, CalendarCheck, IndianRupee, Wheat, Bell, Activity } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#a05c04', '#d97706', '#f59e0b'];

interface DashboardData {
  totalExpense: number;
  totalHarvestQtl: number;
  activeWorkers: number;
  pendingDues: number;
  totalPlots: number;
  recentActivities: { id: string; activityType: string; date: string; plot: { name: string } }[];
  upcomingReminders: { id: string; title: string; dueDate: string; plot?: { name: string } }[];
  monthlyData: { month: string; expense: number }[];
  categoryBreakdown: { name: string; value: number }[];
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--green-primary)' }}>{t.app.name} 🌿</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(), 'EEEE, d MMM yyyy')}</p>
        </div>
        <LanguageToggle />
      </div>

      <div className="page-content">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 animate-fade-in">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #2d6a4f, #40916c)', border: 'none' }}>
                <TrendingDown size={20} className="text-green-200" />
                <p className="text-xs text-green-200 font-medium mt-1">{t.dashboard.totalExpense}</p>
                <p className="text-xl font-bold text-white">{fmt(data?.totalExpense || 0)}</p>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #7c4d03, #a05c04)', border: 'none' }}>
                <Wheat size={20} className="text-amber-200" />
                <p className="text-xs text-amber-200 font-medium mt-1">{t.dashboard.totalIncome}</p>
                <p className="text-xl font-bold text-white">{data?.totalHarvestQtl?.toFixed(1) || '0'} {t.common.qtl}</p>
              </div>
              <div className="stat-card">
                <Users size={18} style={{ color: 'var(--green-light)' }} />
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{t.dashboard.activeWorkers}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.activeWorkers || 0}</p>
              </div>
              <div className="stat-card">
                <Layers size={18} style={{ color: 'var(--green-light)' }} />
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{t.dashboard.totalPlots}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{data?.totalPlots || 0}</p>
              </div>
            </div>

            {/* Pending Dues Banner */}
            {(data?.pendingDues || 0) > 0 && (
              <div className="card mb-4 flex items-center gap-3 animate-fade-in" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
                  <IndianRupee size={20} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#92400e' }}>{t.dashboard.pendingDues}</p>
                  <p className="text-lg font-bold" style={{ color: '#7c4d03' }}>{fmt(data?.pendingDues || 0)}</p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mb-4">
              <p className="section-title">{t.dashboard.quickActions}</p>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { href: '/plots/new', Icon: Plus, label: t.dashboard.addPlot, color: '#2d6a4f' },
                  { href: '/workers/attendance', Icon: CalendarCheck, label: t.dashboard.markAttendance, color: '#40916c' },
                  { href: '/expenses/new', Icon: IndianRupee, label: t.dashboard.addExpense, color: '#7c4d03' },
                ].map(({ href, Icon, label, color }) => (
                  <Link key={href} href={href} className="card flex flex-col items-center gap-2 py-4 active:scale-95 transition-all">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Expense Pie Chart */}
            {(data?.categoryBreakdown?.length || 0) > 0 && (
              <div className="card mb-4 animate-fade-in">
                <p className="section-title">{t.dashboard.expenseBreakdown}</p>
                <div className="flex items-center gap-4">
                  <PieChart width={140} height={140}>
                    <Pie data={data!.categoryBreakdown} cx={65} cy={65} innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {data!.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div className="flex-1 space-y-1.5">
                    {data!.categoryBreakdown.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span style={{ color: 'var(--text-secondary)' }} className="capitalize">{item.name}</span>
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Bar Chart */}
            {(data?.monthlyData?.length || 0) > 0 && (
              <div className="card mb-4 animate-fade-in">
                <p className="section-title">{t.dashboard.monthlyChart}</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={data!.monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8aab8a' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => {
                        const v = typeof value === 'number' ? value : 0;
                        return [`₹${v.toLocaleString('en-IN')}`, ''];
                      }}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    />
                    <Bar dataKey="expense" fill="#52b788" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Upcoming Reminders */}
            {(data?.upcomingReminders?.length || 0) > 0 && (
              <div className="card mb-4 animate-fade-in">
                <p className="section-title flex items-center gap-2">
                  <Bell size={18} style={{ color: 'var(--green-primary)' }} />
                  {t.dashboard.upcomingReminders}
                </p>
                <div className="space-y-2">
                  {data!.upcomingReminders.map(r => (
                    <div key={r.id} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--earth-pale)' }}>
                        <AlertCircle size={16} style={{ color: 'var(--earth-brown)' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {r.plot?.name && `${r.plot.name} • `}
                          {format(new Date(r.dueDate), 'd MMM')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="card mb-4 animate-fade-in">
              <p className="section-title flex items-center gap-2">
                <Activity size={18} style={{ color: 'var(--green-primary)' }} />
                {t.dashboard.recentActivity}
              </p>
              {(data?.recentActivities?.length || 0) === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>{t.dashboard.noActivity}</p>
              ) : (
                <div className="space-y-2">
                  {data!.recentActivities.map(a => (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green-light)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {a.activityType} — {a.plot?.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(a.date), 'd MMM yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
