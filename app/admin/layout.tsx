import type { Metadata } from 'next'
import AdminNav from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: '後台管理 · SHANSHAN.STUDIO',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <AdminNav />
      <main className="pb-20">{children}</main>
    </div>
  )
}
