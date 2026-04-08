import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SHANSHAN.STUDIO',
  description: '珊珊工作室 · 熱蠟除毛預約管理系統',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#5C4D42',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  )
}
