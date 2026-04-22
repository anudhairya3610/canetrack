'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, IndianRupee, FileText, ChevronDown,
  ChevronUp, CreditCard, Clock, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { format } from 'date-fns';

interface BillPayment {
  id: string;
  amount: number;
  date: string;
  mode: string;
  notes?: string;
}

interface Bill {
  id: string;
  billNumber?: string;
  date: string;
  finalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  items: { itemName: string; quantity: number; totalPrice: number; unit?: string }[];
  payments?: BillPayment[];
}

interface Shop {
  id: string;
  shopName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  shopType?: string;
  bills: Bill[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  paid: { bg: '#dcfce7', color: '#16a34a' },
  partial: { bg: '#fef3c7', color: '#d97706' },
  credit: { bg: '#fee2e2', color: '#dc2626' },
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  partial: Clock,
  credit: CreditCard,
};

const MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank',
  cheque: 'Cheque',
};

export default function ShopDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const shopId = params.id as string;
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [payingBill, setPayingBill] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'cash', notes: '' });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const fetchShop = () => {
    setLoading(true);
    fetch(`/api/shops/${shopId}`)
      .then(r => r.json())
      .then(d => { setShop(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchShop(); }, [shopId]);

  const handlePay = async (billId: string) => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) {
      setPayError('Enter a valid amount');
      return;
    }

    const bill = shop?.bills.find(b => b.id === billId);
    if (bill && amount > bill.dueAmount) {
      setPayError(`Amount cannot exceed due amount (₹${bill.dueAmount.toLocaleString('en-IN')})`);
      return;
    }

    setPayLoading(true);
    setPayError('');
    setPaySuccess('');

    try {
      const res = await fetch(`/api/bills/${billId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payForm),
      });

      if (res.ok) {
        setPaySuccess('Payment recorded! ✅');
        setPayForm({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'cash', notes: '' });
        // Refresh shop data after short delay
        setTimeout(() => {
          setPayingBill(null);
          setPaySuccess('');
          fetchShop();
        }, 1000);
      } else {
        const d = await res.json();
        setPayError(d.error || 'Payment failed');
      }
    } catch {
      setPayError('Something went wrong');
    } finally {
      setPayLoading(false);
    }
  };

  const openPayForm = (bill: Bill) => {
    setPayingBill(bill.id);
    setPayForm({
      amount: bill.dueAmount.toString(),
      date: new Date().toISOString().split('T')[0],
      mode: 'cash',
      notes: '',
    });
    setPayError('');
    setPaySuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--green-pale)', borderTopColor: 'var(--green-primary)' }} />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Shop not found</p>
      </div>
    );
  }

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
            <div>
              <p className="text-xs text-green-200">{t.shops.totalPurchase}</p>
              <p className="text-lg font-bold">₹{totalPurchase.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-green-200">{t.shops.totalPaid}</p>
              <p className="text-lg font-bold">₹{totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-green-200">{t.shops.pendingDue}</p>
              <p className={`text-lg font-bold ${totalDue > 0 ? 'text-yellow-300' : ''}`}>
                ₹{totalDue.toLocaleString('en-IN')}
              </p>
            </div>
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
              const isExpanded = expandedBill === bill.id;
              const isPaying = payingBill === bill.id;
              const StatusIcon = STATUS_ICONS[bill.paymentStatus] || CreditCard;

              return (
                <div key={bill.id} className="card overflow-hidden">
                  {/* Bill Header — Click to expand */}
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {bill.billNumber ? `Bill #${bill.billNumber}` : `Bill — ${format(new Date(bill.date), 'dd MMM')}`}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {format(new Date(bill.date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge text-xs flex items-center gap-1" style={sc}>
                          <StatusIcon size={12} />
                          {bill.paymentStatus}
                        </span>
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</p>
                        <p className="font-semibold">₹{bill.finalAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Paid</p>
                        <p className="font-semibold" style={{ color: '#16a34a' }}>₹{bill.paidAmount.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due</p>
                        <p className="font-semibold" style={{ color: bill.dueAmount > 0 ? '#dc2626' : '#6b7280' }}>
                          ₹{bill.dueAmount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border-color)' }}>

                      {/* Bill Items */}
                      {bill.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Items</p>
                          <div className="space-y-1.5">
                            {bill.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {item.itemName}
                                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                                    × {item.quantity} {item.unit || ''}
                                  </span>
                                </span>
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  ₹{item.totalPrice.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment History */}
                      {bill.payments && bill.payments.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Payment History
                          </p>
                          <div className="space-y-1.5">
                            {bill.payments.map(pay => (
                              <div key={pay.id} className="flex justify-between items-center text-sm py-1.5 px-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div>
                                  <span className="font-semibold" style={{ color: '#16a34a' }}>
                                    ₹{pay.amount.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                                    {MODE_LABELS[pay.mode] || pay.mode}
                                  </span>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {format(new Date(pay.date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Record Payment Button */}
                      {bill.dueAmount > 0 && !isPaying && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openPayForm(bill); }}
                          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                          style={{ background: '#16a34a', color: 'white' }}
                        >
                          <IndianRupee size={16} /> Record Payment
                        </button>
                      )}

                      {/* Payment Form */}
                      {isPaying && (
                        <div
                          className="p-3 rounded-xl space-y-3"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            💰 Record Payment
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="input-label text-xs">Amount ₹ *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={payForm.amount}
                                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder={`Max ₹${bill.dueAmount}`}
                                className="input-field py-2.5 text-sm"
                                max={bill.dueAmount}
                              />
                            </div>
                            <div>
                              <label className="input-label text-xs">Date</label>
                              <input
                                type="date"
                                value={payForm.date}
                                onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                                className="input-field py-2.5 text-sm"
                              />
                            </div>
                          </div>

                          {/* Payment Mode */}
                          <div>
                            <label className="input-label text-xs">Payment Mode</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {Object.entries(MODE_LABELS).map(([val, label]) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setPayForm(f => ({ ...f, mode: val }))}
                                  className="py-2 rounded-lg text-xs font-semibold transition-all"
                                  style={{
                                    background: payForm.mode === val ? 'var(--green-primary)' : 'var(--green-pale)',
                                    color: payForm.mode === val ? 'white' : 'var(--green-primary)',
                                  }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="input-label text-xs">Notes (optional)</label>
                            <input
                              type="text"
                              value={payForm.notes}
                              onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Payment note..."
                              className="input-field py-2.5 text-sm"
                            />
                          </div>

                          {/* Quick Amount Buttons */}
                          <div className="flex gap-2">
                            {[
                              { label: 'Full', amount: bill.dueAmount },
                              { label: 'Half', amount: Math.round(bill.dueAmount / 2) },
                            ].map(opt => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setPayForm(f => ({ ...f, amount: opt.amount.toString() }))}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: 'var(--green-pale)', color: 'var(--green-primary)' }}
                              >
                                {opt.label} — ₹{opt.amount.toLocaleString('en-IN')}
                              </button>
                            ))}
                          </div>

                          {payError && (
                            <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
                              {payError}
                            </p>
                          )}
                          {paySuccess && (
                            <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: '#dcfce7', color: '#16a34a' }}>
                              {paySuccess}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setPayingBill(null); setPayError(''); }}
                              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                              style={{ background: 'var(--green-pale)', color: 'var(--text-secondary)' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePay(bill.id)}
                              disabled={payLoading}
                              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center"
                              style={{ background: '#16a34a' }}
                            >
                              {payLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                'Pay Now'
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Fully paid message */}
                      {bill.dueAmount === 0 && (
                        <div className="flex items-center gap-2 py-2 px-3 rounded-lg" style={{ background: '#dcfce7' }}>
                          <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                          <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>Fully Paid</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}