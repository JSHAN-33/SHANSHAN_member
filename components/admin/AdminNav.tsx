'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: '預約', icon: '📅' },
  { href: '/admin/customers', label: '顧客', icon: '👥' },
  { href: '/admin/costs', label: '帳務', icon: '📊' },
  { href: '/admin/inventory', label: '庫存', icon: '📦' },
  { href: '/admin/services', label: '服務', icon: '✨' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-primary text-lg tracking-wide">
            SHANSHAN.STUDIO
          </h1>
          <span className="text-xs text-muted">後台管理</span>
        </div>
      </header>

      {/* 底部導覽列 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area-inset-bottom">
        <div className="max-w-2xl mx-auto flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-muted hover:text-gray-500'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className={`text-[10px] font-medium ${active ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
