'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Layers, Sprout, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

interface Plot {
  id: string; name: string; areaBigha: number; variety: string;
  plantingDate: string; status: string;
  expenses: { amount: number }[];
  harvestEntries: { quantityQtl: number }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  growing: { bg: '#d8f3dc', text: '#2d6a4f' },
  harvesting: { bg: '#fef3c7', text: '#7c4d03' },
  completed: { bg: '#e5e7eb', text: '#6b7280' },
};

export default function PlotsPage() {
  const { t } = useLanguage();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plots').then(r => r.json()).then(d => { setPlots(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalExpense = (p: Plot) => p.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const totalHarvest = (p: Plot) => p.harvestEntries?.reduce((s, h) => s + h.quantityQtl, 0) || 0;
  const statusLabel = (s: string) => s === 'growing' ? t.plots.growing : s === 'harvesting' ? t.plots.harvesting : t.plots.completed;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.plots.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plots.length} {t.plots.title.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/plots/new" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </Link>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl shimmer" />)}</div>
        ) : plots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--green-pale)' }}>
              <Sprout size={40} style={{ color: 'var(--green-primary)' }} />
            </div>
            <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t.plots.noPlots}</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t.plots.addFirstPlot}</p>
            <Link href="/plots/new" className="btn-primary" style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              <Plus size={18} /> {t.plots.addPlot}
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {plots.map(plot => {
              const sc = STATUS_COLORS[plot.status] || STATUS_COLORS.growing;
              return (
                <Link key={plot.id} href={`/plots/${plot.id}`} className="card block active:scale-98 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
                        <Layers size={24} style={{ color: 'var(--green-primary)' }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{plot.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{plot.variety} • {plot.areaBigha} {t.common.bigha}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="badge" style={{ background: sc.bg, color: sc.text }}>{statusLabel(plot.status)}</span>
                      <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.plantingDate}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {format(new Date(plot.plantingDate), 'MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.totalExpense}</p>
                      <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
                        ₹{totalExpense(plot).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.plots.totalHarvest}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>
                        {totalHarvest(plot).toFixed(1)} {t.common.qtl}
                      </p>
                    </div>
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
