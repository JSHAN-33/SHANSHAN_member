'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  COST_CATEGORIES,
  formatCurrency,
  formatMonthKey,
  getMonthKey,
  getTodayString,
} from '@/lib/utils'

interface CostRecord {
  id: string
  category: string
  description: string | null
  amount: number
  date: string
  createdAt: string
}

export default function CostsPage() {
  const today = getTodayString()
  const [records, setRecords] = useState<CostRecord[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // 新增表單
  const [category, setCategory] = useState(COST_CATEGORIES[0].key)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = filterCategory !== 'all' ? `&category=${filterCategory}` : ''
    const res = await fetch(`/api/costs?${params}`)
    const data = await res.json()
    setRecords(data)
    setLoading(false)
  }, [filterCategory])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleAdd = async () => {
    if (!amount || !date) return
    setSubmitting(true)
    await fetch('/api/costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description, amount: Number(amount), date }),
    })
    setAmount('')
    setDescription('')
    await fetchRecords()
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/costs?id=${id}`, { method: 'DELETE' })
    fetchRecords()
  }

  // 依月份分組
  const grouped: Record<string, CostRecord[]> = {}
  const filteredRecords = filterCategory === 'all'
    ? records
    : records.filter((r) => r.category === filterCategory)

  filteredRecords.forEach((r) => {
    const mk = getMonthKey(r.date)
    if (!grouped[mk]) grouped[mk] = []
    grouped[mk].push(r)
  })
  const monthKeys = Object.keys(grouped).sort().reverse()

  const categoryInfo = (key: string) =>
    COST_CATEGORIES.find((c) => c.key === key) ?? { label: key, emoji: '📋' }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <p className="section-label">成本記帳本 · COST TRACKER</p>

      {/* ── 新增表單 ── */}
      <div className="card p-4 mb-5">
        <div className="flex gap-2 mb-3">
          {/* 分類選擇 */}
          <select
            className="input w-28"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {COST_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          {/* 說明 */}
          <input
            className="input flex-1"
            placeholder="說明（例：購入蜜蠟）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {/* 金額 */}
          <input
            className="input flex-1"
            placeholder="金額 NT$"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {/* 日期 */}
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {/* 記帳按鈕 */}
          <button
            onClick={handleAdd}
            disabled={submitting || !amount}
            className="btn-primary shrink-0"
          >
            記帳
          </button>
        </div>

        {/* 分類快選 */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {COST_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === c.key
                  ? 'bg-primary text-white'
                  : 'bg-subtle text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 篩選列 ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filterCategory === 'all' ? 'bg-primary text-white' : 'bg-subtle text-gray-600'
          }`}
        >
          全部
        </button>
        {COST_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilterCategory(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCategory === c.key ? 'bg-primary text-white' : 'bg-subtle text-gray-600'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* ── 記錄列表 ── */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">載入中…</div>
      ) : monthKeys.length === 0 ? (
        <div className="card p-8 text-center text-muted text-sm">尚無成本記錄</div>
      ) : (
        <div className="space-y-4">
          {monthKeys.map((mk) => {
            const items = grouped[mk]
            const total = items.reduce((s, r) => s + r.amount, 0)
            return (
              <section key={mk}>
                {/* 月份標題 */}
                <div className="flex items-center justify-between py-2 px-1">
                  <span className="text-sm font-semibold text-gray-700">
                    {formatMonthKey(mk)}{' '}
                    <span className="text-muted font-normal text-xs">{items.length} 筆</span>
                  </span>
                  <span className="text-sm font-bold text-danger">
                    -{formatCurrency(total)}
                  </span>
                </div>

                {/* 記錄卡片 */}
                <div className="card divide-y divide-gray-50">
                  {items.map((r) => {
                    const ci = categoryInfo(r.category)
                    return (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-subtle rounded-lg px-2 py-1 text-gray-600">
                            {ci.emoji} {ci.label}
                          </span>
                          <div>
                            <p className="text-sm text-gray-700">
                              {r.description || '－'}
                            </p>
                            <p className="text-xs text-muted">{r.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-danger">
                            -{formatCurrency(r.amount)}
                          </span>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-muted hover:text-danger text-lg leading-none"
                            title="刪除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
