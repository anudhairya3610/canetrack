'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Receipt, ChevronDown, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

interface Expense { id: string; category: string; amount: number; description?: string; date: string; plot?: { name: string }; shop?: { shopName: string }; }

const CATS = ['seed', 'fertilizer', 'pesticide', 'irrigation', 'machinery', 'labour', 'transport', 'rent', 'loanEmi', 'maintenance', 'misc'];
const CAT_COLORS: Record<string, string> = { seed: '#16a34a', fertilizer: '#0369a1', pesticide: '#dc2626', irrigation: '#0891b2', machinery: '#7c3aed', labour: '#d97706', transport: '#ea580c', rent: '#be123c', loanEmi: '#4338ca', maintenance: '#475569', misc: '#6b7280' };

export default function ExpensesPage() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const url = `/api/expenses${filterCat ? `?category=${filterCat}` : ''}`;
    fetch(url).then(r => r.json()).then(d => { setExpenses(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, [filterCat]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.expenses.title}</h1>
          <p className="text-xs font-medium" style={{ color: 'var(--green-primary)' }}>
            {t.expenses.total}: ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilter(!showFilter)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: filterCat ? 'var(--green-primary)' : 'var(--green-pale)' }}>
            <Filter size={18} style={{ color: filterCat ? 'white' : 'var(--green-primary)' }} />
          </button>
          <LanguageToggle />
          <Link href="/expenses/new" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </Link>
        </div>
      </div>

      {showFilter && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide" style={{ background: 'white', borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => setFilterCat('')} className={`tab-btn flex-shrink-0 ${!filterCat ? 'active' : ''}`}>{t.expenses.allCategories}</button>
          {CATS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} className={`tab-btn flex-shrink-0 ${filterCat === c ? 'active' : ''}`}>
              {t.expenses.categories[c as keyof typeof t.expenses.categories]}
            </button>
          ))}
        </div>
      )}

      <div className="page-content">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl shimmer" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--green-pale)' }}>
              <Receipt size={40} style={{ color: 'var(--green-primary)' }} />
            </div>
            <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t.expenses.noExpenses}</p>
            <Link href="/expenses/new" className="btn-primary mt-4" style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              <Plus size={18} /> {t.expenses.addExpense}
            </Link>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {expenses.map(exp => {
              const color = CAT_COLORS[exp.category] || '#6b7280';
              return (
                <div key={exp.id} className="card flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                    <Receipt size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm capitalize truncate" style={{ color: 'var(--text-primary)' }}>
                        {t.expenses.categories[exp.category as keyof typeof t.expenses.categories] || exp.category}
                      </p>
                      <p className="font-bold text-sm flex-shrink-0 ml-2" style={{ color: '#dc2626' }}>₹{exp.amount.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {exp.description && `${exp.description} • `}
                      {exp.plot?.name && `${exp.plot.name} • `}
                      {format(new Date(exp.date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
