'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, IndianRupee, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { format } from 'date-fns';

interface Bill { id: string; billNumber?: string; date: string; finalAmount: number; paidAmount: number; dueAmount: number; paymentStatus: string; items: { itemName: string; quantity: number; totalPrice: number }[]; }
interface Shop { id: string; shopName: string; ownerName?: string; phone?: string; address?: string; shopType?: string; bills: Bill[]; }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  paid: { bg: '#dcfce7', color: '#16a34a' },
  partial: { bg: '#fef3c7', color: '#d97706' },
  credit: { bg: '#fee2e2', color: '#dc2626' },
};

export default function ShopDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shops/${shopId}`).then(r => r.json()).then(d => { setShop(d); setLoading(false); }).catch(() => setLoading(false));
  }, [shopId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}><div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--green-pale)', borderTopColor: 'var(--green-primary)' }} /></div>;
  if (!shop) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}><p style={{ color: 'var(--text-muted)' }}>Shop not found</p></div>;

  const totalPurchase = shop.bills.reduce((s, b) => s + b.finalAmount, 0);
  const totalPaid = shop.bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDue = shop.bills.reduce((s, b) => s + b.dueAmount, 0);

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/shops" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-pale)' }}>
            <ArrowLeft size={20} style={{ color: 'var(--green-primary)' }} />
          </Link>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{shop.shopName}</h1>
            {shop.shopType && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shop.shopType}</p>}
          </div>
        </div>
        <LanguageToggle />
      </div>
      <div className="px-4 pt-4 space-y-4">
        {/* Summary */}
        <div className="card-highlight text-white">
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-xs text-green-200">{t.shops.totalPurchase}</p><p className="text-lg font-bold">₹{totalPurchase.toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-green-200">{t.shops.totalPaid}</p><p className="text-lg font-bold">₹{totalPaid.toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-green-200">{t.shops.pendingDue}</p><p className={`text-lg font-bold ${totalDue > 0 ? 'text-yellow-300' : ''}`}>₹{totalDue.toLocaleString('en-IN')}</p></div>
          </div>
        </div>
        {/* Add bill button */}
        <Link href={`/shops/${shopId}/new-bill`} className="btn-primary py-3.5 flex items-center justify-center gap-2">
          <Plus size={18} /> {t.shops.addBill}
        </Link>
        {/* Bills list */}
        <p className="section-title">{t.shops.allBills}</p>
        {shop.bills.length === 0 ? (
          <div className="card text-center py-8">
            <FileText size={36} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t.common.noData}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shop.bills.map(bill => {
              const sc = STATUS_COLORS[bill.paymentStatus] || STATUS_COLORS.credit;
              return (
                <div key={bill.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {bill.billNumber ? `Bill #${bill.billNumber}` : `Bill — ${format(new Date(bill.date), 'dd MMM')}`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(bill.date), 'dd MMM yyyy')}</p>
                    </div>
                    <span className="badge text-xs" style={sc}>{bill.paymentStatus}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p><p className="font-semibold">₹{bill.finalAmount.toLocaleString('en-IN')}</p></div>
                    <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Paid</p><p className="font-semibold" style={{ color: '#16a34a' }}>₹{bill.paidAmount.toLocaleString('en-IN')}</p></div>
                    <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due</p><p className="font-semibold" style={{ color: bill.dueAmount > 0 ? '#dc2626' : '#6b7280' }}>₹{bill.dueAmount.toLocaleString('en-IN')}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
