'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  formatCurrency,
  formatDate,
  GENDER_OPTIONS,
  SERVICE_CATEGORIES,
  getTodayString,
  TIME_SLOTS,
} from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone: string | null
  birthday: string | null
  gender: string | null
  storedValue: number
  notes: string | null
  isNewCustomer: boolean
  createdAt: string
  _count?: { bookings: number }
}

interface Service {
  id: string
  name: string
  price: number
  category: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setCustomers(data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(t)
  }, [fetchCustomers])

  const openNew = () => {
    setEditCustomer(null)
    setShowModal(true)
  }

  const openEdit = (c: Customer) => {
    setEditCustomer(c)
    setShowModal(true)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* 頂部操作列 */}
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="搜尋姓名或電話…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={openNew} className="btn-primary shrink-0">
          + 新增
        </button>
      </div>

      {/* 顧客列表 */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">載入中…</div>
      ) : customers.length === 0 ? (
        <div className="card p-8 text-center text-muted text-sm">
          {search ? '找不到符合的顧客' : '尚無顧客資料，點擊「+ 新增」建立第一位顧客'}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => openEdit(c)}
              className="card w-full p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{c.name}</span>
                    {c.isNewCustomer && (
                      <span className="text-[10px] bg-gold-light text-gold font-medium px-1.5 py-0.5 rounded-full">
                        ✨ 新客
                      </span>
                    )}
                  </div>
                  {c.phone && <p className="text-xs text-muted mt-0.5">{c.phone}</p>}
                  <div className="flex gap-3 mt-1">
                    {c._count && (
                      <span className="text-xs text-gray-500">
                        預約 {c._count.bookings} 次
                      </span>
                    )}
                    {c.storedValue > 0 && (
                      <span className="text-xs text-gold">
                        儲值 {formatCurrency(c.storedValue)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-muted text-lg">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 顧客 Modal */}
      {showModal && (
        <CustomerModal
          customer={editCustomer}
          onSave={() => {
            setShowModal(false)
            fetchCustomers()
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── 顧客 Modal（新增 / 編輯） ──────────────────────────────────────────────────

function CustomerModal({
  customer,
  onSave,
  onClose,
}: {
  customer: Customer | null
  onSave: () => void
  onClose: () => void
}) {
  const isNew = !customer

  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [birthday, setBirthday] = useState(customer?.birthday ?? '')
  const [gender, setGender] = useState(customer?.gender ?? 'unset')
  const [storedValue, setStoredValue] = useState(String(customer?.storedValue ?? 0))
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [isNewCustomer, setIsNewCustomer] = useState(customer?.isNewCustomer ?? true)

  // 同步建立預約
  const [bookingDate, setBookingDate] = useState(getTodayString())
  const [bookingTime, setBookingTime] = useState('')
  const [bookingServices, setBookingServices] = useState<string[]>([])
  const [serviceTab, setServiceTab] = useState<'female' | 'male' | 'product'>('female')
  const [services, setServices] = useState<Service[]>([])
  const [showBookingSection, setShowBookingSection] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then(setServices)
  }, [])

  const filteredServices = services.filter((s) => s.category === serviceTab)

  const toggleService = (id: string) => {
    setBookingServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('請輸入姓名'); return }
    setSubmitting(true)
    setError('')

    try {
      const payload: Record<string, unknown> = {
        name, phone, birthday, gender,
        storedValue: Number(storedValue),
        notes, isNewCustomer,
      }

      if (showBookingSection && bookingDate && bookingTime && bookingServices.length) {
        payload.booking = {
          date: bookingDate,
          time: bookingTime,
          serviceIds: bookingServices,
        }
      }

      if (isNew) {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? '建立失敗')
          return
        }
      } else {
        await fetch(`/api/customers/${customer!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      onSave()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">{isNew ? '新增顧客' : '編輯顧客'}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* 姓名 */}
            <input
              className="input"
              placeholder="姓名（必填）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* 手機 */}
            <div className="bg-subtle rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">手機</span>
              <input
                className="bg-transparent text-right text-sm outline-none w-40"
                placeholder="09xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
            </div>

            {/* 生日 */}
            <div className="bg-subtle rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">生日</span>
              <input
                type="date"
                className="bg-transparent text-right text-sm outline-none"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>

            {/* 性別 */}
            <div className="bg-subtle rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">性別</span>
              <select
                className="bg-transparent text-right text-sm outline-none"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 儲值金 */}
            <div className="bg-subtle rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">儲值金餘額</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted">NT$</span>
                <input
                  type="number"
                  className="bg-transparent text-right text-sm outline-none w-20"
                  value={storedValue}
                  onChange={(e) => setStoredValue(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* 備註 */}
            <textarea
              className="input resize-none"
              placeholder="備註：VIP 等級、特殊膚質、偏好項目…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {/* 是否新客 */}
            <label className="flex items-center gap-3 px-1 cursor-pointer">
              <div
                onClick={() => setIsNewCustomer((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  isNewCustomer ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    isNewCustomer ? 'left-5' : 'left-1'
                  }`}
                />
              </div>
              <span className="text-sm text-gray-600">新客（享新客優惠）</span>
            </label>

            {/* 同步建立預約 */}
            {isNew && (
              <div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted font-medium tracking-wide">
                    同步建立預約（選填）
                  </span>
                  <button
                    onClick={() => setShowBookingSection((v) => !v)}
                    className="text-xs text-primary"
                  >
                    {showBookingSection ? '收起 ▲' : '展開 ▼'}
                  </button>
                </div>

                {showBookingSection && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-subtle rounded-xl px-3 py-3">
                        <p className="text-xs text-muted mb-1">日期</p>
                        <input
                          type="date"
                          className="bg-transparent text-sm outline-none w-full"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                        />
                      </div>
                      <div className="bg-subtle rounded-xl px-3 py-3">
                        <p className="text-xs text-muted mb-1">時間</p>
                        <select
                          className="bg-transparent text-sm outline-none w-full"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                        >
                          <option value="">選擇時間</option>
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 服務分類 Tab */}
                    <div className="flex bg-subtle rounded-xl p-1">
                      {SERVICE_CATEGORIES.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setServiceTab(key as 'female' | 'male' | 'product')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            serviceTab === key
                              ? 'bg-white text-primary shadow-sm'
                              : 'text-muted'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* 服務列表 */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {filteredServices.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleService(s.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                            bookingServices.includes(s.id)
                              ? 'bg-primary/10 border-2 border-primary text-primary'
                              : 'bg-subtle text-gray-700 border-2 border-transparent'
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="font-medium">{formatCurrency(s.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-danger mt-3">{error}</p>}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button onClick={onClose} className="btn-outline">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? '儲存中…' : isNew ? '建立顧客' : '儲存變更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
