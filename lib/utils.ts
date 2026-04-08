// ─── 時段設定 ─────────────────────────────────────────────────────────────────
// 每日開放時段：11:00 ~ 20:00，每 30 分鐘一格
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let h = 11; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})()

// ─── 費用分類 ─────────────────────────────────────────────────────────────────
export const COST_CATEGORIES = [
  { key: 'supplies', label: '耗材', emoji: '🧴' },
  { key: 'rent', label: '店租', emoji: '🏠' },
  { key: 'utilities', label: '水電', emoji: '💡' },
  { key: 'marketing', label: '行銷', emoji: '📣' },
] as const

export type CostCategory = (typeof COST_CATEGORIES)[number]['key']

// ─── 新客優惠 ─────────────────────────────────────────────────────────────────
export const NEW_CUSTOMER_DISCOUNT =
  Number(process.env.NEXT_PUBLIC_NEW_CUSTOMER_DISCOUNT ?? 200)

// ─── 格式化工具 ───────────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

/** 'YYYY-MM-DD' → '2026 年 4 月 8 日' */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y} 年 ${m} 月 ${d} 日`
}

/** 'YYYY-MM' → '2026 年 4 月' */
export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${y} 年 ${m} 月`
}

/** 取今天的 'YYYY-MM-DD' */
export function getTodayString(): string {
  const now = new Date()
  return toDateString(now)
}

/** Date → 'YYYY-MM-DD' */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → 取月份前綴 'YYYY-MM' */
export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7)
}

/** 產生某月份所有日期 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

/** 星期中文 */
export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 性別標籤 */
export const GENDER_OPTIONS = [
  { value: 'female', label: '女' },
  { value: 'male', label: '男' },
  { value: 'unset', label: '不設定' },
]

/** 服務分類 */
export const SERVICE_CATEGORIES = [
  { key: 'female', label: '女生' },
  { key: 'male', label: '男士' },
  { key: 'product', label: '產品' },
] as const

/** 付款方式 */
export const PAYMENT_METHODS = [
  { key: 'cash', label: '現金', emoji: '💵' },
  { key: 'transfer', label: '轉帳', emoji: '🏦' },
] as const
