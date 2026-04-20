'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Users, Receipt, MoreHorizontal, X, ShoppingBag, Package, Wheat, BarChart2, Cloud, Settings } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const moreItems = [
    { href: '/shops', icon: ShoppingBag, label: t.nav.shops },
    { href: '/inventory', icon: Package, label: t.nav.inventory },
    { href: '/harvest', icon: Wheat, label: t.nav.harvest },
    { href: '/reports', icon: BarChart2, label: t.nav.reports },
    { href: '/weather', icon: Cloud, label: t.nav.weather },
    { href: '/settings', icon: Settings, label: t.nav.settings },
  ];

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] z-50 rounded-2xl p-3 animate-slide-up"
          style={{ background: 'white', boxShadow: '0 -4px 30px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{t.nav.more}</span>
            <button onClick={() => setShowMore(false)} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95"
                style={{
                  background: isActive(href) ? 'var(--green-pale)' : '#f8fbf8',
                  color: isActive(href) ? 'var(--green-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Icon size={22} />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          { href: '/', icon: Home, label: t.nav.home },
          { href: '/plots', icon: Layers, label: t.nav.plots },
          { href: '/workers', icon: Users, label: t.nav.workers },
          { href: '/expenses', icon: Receipt, label: t.nav.expenses },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
        <button
          className={`nav-item ${showMore ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <MoreHorizontal size={22} />
          <span className="text-xs font-medium">{t.nav.more}</span>
        </button>
      </nav>
    </>
  );
}
