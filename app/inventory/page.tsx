'use client';
import { useEffect, useState } from 'react';
import { Plus, Package, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import BottomNav from '@/components/BottomNav';
import { format } from 'date-fns';

interface InventoryItem { id: string; itemName: string; category?: string; currentStock: number; unit?: string; logs: { id: string; type: string; quantity: number; date: string; notes?: string }[]; }

const COMMON_ITEMS = ['Urea', 'DAP', 'Potash', 'Zinc', 'SSP', 'MOP', 'NPK', 'Sulphur', 'Calcium'];

export default function InventoryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [logModal, setLogModal] = useState<{ itemId: string; type: 'in' | 'out' } | null>(null);
  const [newItem, setNewItem] = useState({ itemName: '', category: 'Fertilizer', currentStock: '', unit: 'Bag' });
  const [logForm, setLogForm] = useState({ quantity: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    fetch('/api/inventory').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!newItem.itemName) return;
    setSaving(true);
    await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_item', ...newItem }) });
    setSaving(false);
    setShowAdd(false);
    setNewItem({ itemName: '', category: 'Fertilizer', currentStock: '', unit: 'Bag' });
    fetchItems();
  };

  const logStock = async () => {
    if (!logModal || !logForm.quantity) return;
    setSaving(true);
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log', itemId: logModal.itemId, type: logModal.type, ...logForm }),
    });
    setSaving(false);
    setLogModal(null);
    setLogForm({ quantity: '', date: new Date().toISOString().split('T')[0], notes: '' });
    fetchItems();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.inventory.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Add item form */}
        {showAdd && (
          <div className="card mb-4 space-y-3 animate-fade-in" style={{ border: '2px solid var(--green-primary)' }}>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{t.inventory.addItem}</p>
            <div className="relative">
              <select value={newItem.itemName} onChange={e => setNewItem(f => ({ ...f, itemName: e.target.value }))} className="input-field appearance-none pr-8">
                <option value="">Select item</option>
                {COMMON_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                <option value="custom">Custom...</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
            {newItem.itemName === 'custom' && (
              <input type="text" placeholder="Item name" className="input-field" onChange={e => setNewItem(f => ({ ...f, itemName: e.target.value }))} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={newItem.currentStock} onChange={e => setNewItem(f => ({ ...f, currentStock: e.target.value }))} placeholder="Opening stock" className="input-field py-2.5 text-sm" />
              <div className="relative">
                <select value={newItem.unit} onChange={e => setNewItem(f => ({ ...f, unit: e.target.value }))} className="input-field appearance-none pr-6 py-2.5 text-sm">
                  {['Bag', 'Kg', 'Litre', 'Quintal', 'Box'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2.5 text-sm">{t.common.cancel}</button>
              <button onClick={addItem} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm">{t.common.save}</button>
            </div>
          </div>
        )}

        {/* Log modal */}
        {logModal && (
          <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-[480px] mx-auto rounded-t-3xl p-6 space-y-3" style={{ background: 'white' }}>
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {logModal.type === 'in' ? '📦 Add Stock' : '📤 Use Stock'}
              </p>
              <input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
              <input type="number" step="0.1" value={logForm.quantity} onChange={e => setLogForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Quantity *" className="input-field" />
              <input type="text" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder={t.common.notes} className="input-field" />
              <div className="flex gap-2">
                <button onClick={() => setLogModal(null)} className="btn-secondary flex-1">{t.common.cancel}</button>
                <button onClick={logStock} disabled={saving} className="btn-primary flex-1">{t.common.save}</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package size={48} className="mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{t.inventory.noItems}</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4" style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              <Plus size={18} /> {t.inventory.addItem}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {items.map(item => (
              <div key={item.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.itemName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: item.currentStock <= 0 ? '#dc2626' : 'var(--green-primary)' }}>{item.currentStock}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.unit}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLogModal({ itemId: item.id, type: 'in' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <TrendingUp size={14} /> {t.inventory.addStock}
                  </button>
                  <button onClick={() => setLogModal({ itemId: item.id, type: 'out' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <TrendingDown size={14} /> {t.inventory.removeStock}
                  </button>
                </div>
                {item.logs.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Recent</p>
                    {item.logs.slice(0, 3).map(log => (
                      <div key={log.id} className="flex justify-between text-xs py-1">
                        <span style={{ color: log.type === 'in' ? '#16a34a' : '#dc2626' }}>
                          {log.type === 'in' ? '+' : '-'}{log.quantity} {item.unit}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{format(new Date(log.date), 'dd MMM')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
