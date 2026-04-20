'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ShoppingBag, Phone, IndianRupee, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
export const dynamic = 'force-dynamic';
interface Shop {
  id: string; shopName: string; ownerName?: string; phone?: string; shopType?: string;
  bills: { finalAmount: number; paidAmount: number; dueAmount: number }[];
}

export default function ShopsPage() {
  const { t } = useLanguage();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(d => { setShops(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalPurchase = (s: Shop) => s.bills?.reduce((sum, b) => sum + b.finalAmount, 0) || 0;
  const totalPaid = (s: Shop) => s.bills?.reduce((sum, b) => sum + b.paidAmount, 0) || 0;
  const totalDue = (s: Shop) => s.bills?.reduce((sum, b) => sum + b.dueAmount, 0) || 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.shops.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shops.length} shops</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/shops/new" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </Link>
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl shimmer" />)}</div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--green-pale)' }}>
              <ShoppingBag size={40} style={{ color: 'var(--green-primary)' }} />
            </div>
            <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t.shops.noShops}</p>
            <Link href="/shops/new" className="btn-primary mt-4" style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              <Plus size={18} /> {t.shops.addShop}
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {shops.map(shop => {
              const due = totalDue(shop);
              return (
                <Link key={shop.id} href={`/shops/${shop.id}`} className="card block active:scale-95 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--earth-brown), var(--earth-light))' }}>
                        {shop.shopName[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{shop.shopName}</h3>
                        {shop.ownerName && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{shop.ownerName}</p>}
                        {shop.phone && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Phone size={11} /> {shop.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.shops.totalPurchase}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{totalPurchase(shop).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.shops.totalPaid}</p>
                      <p className="text-sm font-bold" style={{ color: '#16a34a' }}>₹{totalPaid(shop).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.shops.pendingDue}</p>
                      <p className="text-sm font-bold" style={{ color: due > 0 ? '#dc2626' : '#6b7280' }}>₹{due.toLocaleString('en-IN')}</p>
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
