import { redirect } from 'next/navigation'

// 根路徑直接導向後台管理
export default function Home() {
  redirect('/admin')
}
