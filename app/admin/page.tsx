'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  formatCurrency,
  formatDate,
  getMonthKey,
  formatMonthKey,
  getTodayString,
  TIME_SLOTS,
  NEW_CUSTOMER_DISCOUNT,
  PAYMENT_METHODS,
  toDateString,
  getDaysInMonth,
  WEEKDAY_LABELS,
} from '@/lib/utils'

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  phone: string | null
  isNewCustomer: boolean
  storedValue: number
}

interface Service {
  id: string
  name: string
  price: number
  category: string
}

interface BookingService {
  service: Service
  price: number
}

interface Booking {
  id: string
  customerId: string
  customer: Customer
  date: string
  time: string
  status: string
  bookingServices: BookingService[]
  transaction: null | { id: string }
}

interface Transaction {
  id: string
  customerId: string
  customer: Customer
  booking: Booking | null
  finalAmount: number
  originalAmount: number
  discountType: string | null
  discountAmount: number
  paymentMethod: string
  paidAt: string
}

interface TimeSlot {
  time: string
  status: 'available' | 'locked' | 'booked'
  booking?: {
    id: string
    customerName: string
    customerPhone: string | null
    services: string[]
  }
  reason?: string
}

// ─── 主頁面 ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const today = getTodayString()
  const [currentMonth, setCurrentMonth] = useState(() => today.slice(0, 7))
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [completedTransactions, setCompletedTransactions] = useState<Transaction[]>([])
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  // 行程管理
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  // 結帳
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null)

  // 顯示標籤
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar'>('bookings')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?month=${currentMonth}`)
      const data = await res.json()
      setPendingBookings(data.pendingBookings ?? [])
      setCompletedTransactions(data.completedTransactions ?? [])
      setMonthRevenue(data.monthRevenue ?? 0)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const fetchTimeSlots = async (date: string) => {
    const res = await fetch(`/api/timeslots?date=${date}`)
    const data = await res.json()
    setTimeSlots(data)
  }

  const openCalendar = (date: string) => {
    setSelectedDate(date)
    fetchTimeSlots(date)
    setShowCalendarModal(true)
  }

  const toggleSlot = async (time: string, currentStatus: 'available' | 'locked' | 'booked') => {
    if (!selectedDate || currentStatus === 'booked') return
    if (currentStatus === 'available') {
      await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time }),
      })
    } else {
      await fetch('/api/timeslots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, time }),
      })
    }
    fetchTimeSlots(selectedDate)
  }

  const handleCheckoutDone = () => {
    setCheckoutBooking(null)
    fetchDashboard()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* ── 月份統計 ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="本月結帳"
          value={`${completedTransactions.length} 筆`}
          sub={formatMonthKey(currentMonth)}
        />
        <StatCard
          label="本月營收"
          value={formatCurrency(monthRevenue)}
          sub={formatMonthKey(currentMonth)}
          highlight
        />
      </div>

      {/* ── 月份切換 ── */}
      <MonthSwitcher value={currentMonth} onChange={setCurrentMonth} />

      {/* ── Tab ── */}
      <div className="flex bg-subtle rounded-xl p-1 mb-4">
        {[
          { key: 'bookings', label: '預約管理' },
          { key: 'calendar', label: '行程管理' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'bookings' | 'calendar')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">載入中…</div>
      ) : activeTab === 'bookings' ? (
        <BookingsView
          pendingBookings={pendingBookings}
          completedTransactions={completedTransactions}
          onCheckout={setCheckoutBooking}
          onRefresh={fetchDashboard}
        />
      ) : (
        <CalendarView
          month={currentMonth}
          onSelectDate={openCalendar}
          pendingBookings={pendingBookings}
          completedTransactions={completedTransactions}
        />
      )}

      {/* ── 時段管理 Modal ── */}
      {showCalendarModal && selectedDate && (
        <TimeSlotModal
          date={selectedDate}
          slots={timeSlots}
          onToggle={toggleSlot}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* ── 結帳 Modal ── */}
      {checkoutBooking && (
        <CheckoutModal
          booking={checkoutBooking}
          onDone={handleCheckoutDone}
          onCancel={() => setCheckoutBooking(null)}
        />
      )}
    </div>
  )
}

// ─── 統計卡片 ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-primary' : 'text-gray-800'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── 月份切換 ──────────────────────────────────────────────────────────────────

function MonthSwitcher({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const prev = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const next = () => {
    const [y, m] = value.split('-').map(Number)
    const d = new Date(y, m, 1)
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
        ‹
      </button>
      <span className="text-sm font-semibold text-gray-700">{formatMonthKey(value)}</span>
      <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
        ›
      </button>
    </div>
  )
}

// ─── 預約管理檢視 ──────────────────────────────────────────────────────────────

function BookingsView({
  pendingBookings,
  completedTransactions,
  onCheckout,
  onRefresh,
}: {
  pendingBookings: Booking[]
  completedTransactions: Transaction[]
  onCheckout: (b: Booking) => void
  onRefresh: () => void
}) {
  const cancelBooking = async (id: string) => {
    if (!confirm('確定取消此預約？')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="space-y-5">
      {/* 待結帳 */}
      <section>
        <p className="section-label">待結帳 · {pendingBookings.length} 筆</p>
        {pendingBookings.length === 0 ? (
          <div className="card p-6 text-center text-muted text-sm">目前無待結帳預約</div>
        ) : (
          <div className="space-y-2">
            {pendingBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onCheckout={() => onCheckout(b)}
                onCancel={() => cancelBooking(b.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 已結帳 */}
      <section>
        <p className="section-label">已結帳 · {completedTransactions.length} 筆</p>
        {completedTransactions.length === 0 ? (
          <div className="card p-6 text-center text-muted text-sm">尚無結帳紀錄</div>
        ) : (
          <div className="space-y-2">
            {completedTransactions.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── 預約卡片 ──────────────────────────────────────────────────────────────────

function BookingCard({
  booking, onCheckout, onCancel,
}: {
  booking: Booking
  onCheckout: () => void
  onCancel: () => void
}) {
  const total = booking.bookingServices.reduce((s, bs) => s + bs.price, 0)
  const services = booking.bookingServices.map((bs) => bs.service.name).join('、')

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-gray-800">{booking.customer.name}</span>
            {booking.customer.phone && (
              <span className="text-xs text-muted">{booking.customer.phone}</span>
            )}
          </div>
          <p className="text-xs text-muted mb-1">
            {formatDate(booking.date)} {booking.time}
          </p>
          <p className="text-xs text-gray-600 truncate">{services}</p>
          {booking.customer.isNewCustomer && (
            <span className="inline-block mt-1 text-[10px] bg-gold-light text-gold font-medium px-2 py-0.5 rounded-full">
              ✨ 新客
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-800">{formatCurrency(total)}</p>
          <div className="flex gap-1 mt-2">
            <button
              onClick={onCancel}
              className="text-xs text-muted border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={onCheckout}
              className="text-xs text-white bg-primary rounded-lg px-3 py-1 hover:bg-primary-hover"
            >
              結帳
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 已結帳卡片 ────────────────────────────────────────────────────────────────

function TransactionCard({ transaction: t }: { transaction: Transaction }) {
  const services =
    t.booking?.bookingServices.map((bs) => bs.service.name).join('、') ?? '－'
  const paidAt = new Date(t.paidAt)

  return (
    <div className="card p-4 opacity-80">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">{t.customer.name}</span>
            {t.customer.phone && (
              <span className="text-xs text-muted">{t.customer.phone}</span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {`${paidAt.getFullYear()}-${String(paidAt.getMonth()+1).padStart(2,'0')}-${String(paidAt.getDate()).padStart(2,'0')} ${String(paidAt.getHours()).padStart(2,'0')}:${String(paidAt.getMinutes()).padStart(2,'0')}`}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{services}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-700">{formatCurrency(t.finalAmount)}</p>
          {t.discountAmount > 0 && (
            <p className="text-xs text-muted line-through">
              {formatCurrency(t.originalAmount)}
            </p>
          )}
          <p className="text-xs text-muted mt-0.5">
            {t.paymentMethod === 'cash' ? '💵 現金' : '🏦 轉帳'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── 行程管理（月曆檢視）──────────────────────────────────────────────────────

function CalendarView({
  month,
  onSelectDate,
  pendingBookings,
  completedTransactions,
}: {
  month: string
  onSelectDate: (date: string) => void
  pendingBookings: Booking[]
  completedTransactions: Transaction[]
}) {
  const [y, m] = month.split('-').map(Number)
  const days = getDaysInMonth(y, m)
  const firstDay = days[0].getDay()

  // 各日期的預約計數
  const bookingCountByDate: Record<string, number> = {}
  ;[...pendingBookings, ...completedTransactions.map((t) => t.booking).filter(Boolean)].forEach(
    (b) => {
      if (!b) return
      bookingCountByDate[b.date] = (bookingCountByDate[b.date] ?? 0) + 1
    }
  )

  const today = getTodayString()

  return (
    <div className="card p-4">
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs text-muted py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* 空格填充 */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => {
          const ds = toDateString(d)
          const count = bookingCountByDate[ds] ?? 0
          const isToday = ds === today
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-colors
                ${isToday ? 'bg-primary text-white font-bold' : 'hover:bg-gray-50 text-gray-700'}
              `}
            >
              <span>{d.getDate()}</span>
              {count > 0 && (
                <span
                  className={`text-[8px] w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isToday ? 'bg-white' : 'bg-available'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── 時段管理 Modal ────────────────────────────────────────────────────────────

function TimeSlotModal({
  date,
  slots,
  onToggle,
  onClose,
}: {
  date: string
  slots: TimeSlot[]
  onToggle: (time: string, status: 'available' | 'locked' | 'booked') => void
  onClose: () => void
}) {
  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">{formatDate(date)}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-muted mb-4">點時段封鎖或解鎖</p>

          {/* 圖例 */}
          <div className="flex gap-4 text-xs text-gray-600 mb-5">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary inline-block" /> 已預約
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-muted inline-block" /> 封鎖
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-available inline-block" /> 空檔
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-3 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => onToggle(slot.time, slot.status)}
              disabled={slot.status === 'booked'}
              className={`rounded-2xl p-3 text-center transition-all
                ${slot.status === 'booked' ? 'slot-booked' : ''}
                ${slot.status === 'locked' ? 'slot-locked' : ''}
                ${slot.status === 'available' ? 'slot-available' : ''}
              `}
            >
              <p className="font-semibold text-sm">{slot.time}</p>
              <p className="text-xs mt-0.5">
                {slot.status === 'booked'
                  ? slot.booking?.customerName ?? '已預約'
                  : slot.status === 'locked'
                  ? '封鎖'
                  : '空檔'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 結帳 Modal ────────────────────────────────────────────────────────────────

function CheckoutModal({
  booking,
  onDone,
  onCancel,
}: {
  booking: Booking
  onDone: () => void
  onCancel: () => void
}) {
  const originalAmount = booking.bookingServices.reduce((s, bs) => s + bs.price, 0)
  const services = booking.bookingServices.map((bs) => bs.service.name).join('、')

  const [useNewCustomerDiscount, setUseNewCustomerDiscount] = useState(
    booking.customer.isNewCustomer
  )
  const [useStoredValue, setUseStoredValue] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [submitting, setSubmitting] = useState(false)

  const discountAmount =
    (useNewCustomerDiscount ? NEW_CUSTOMER_DISCOUNT : 0) +
    (useStoredValue ? Math.min(booking.customer.storedValue, originalAmount) : 0)

  const finalAmount = Math.max(0, originalAmount - discountAmount)

  const discountType = useNewCustomerDiscount
    ? 'newCustomer'
    : useStoredValue
    ? 'storedValue'
    : null

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          customerId: booking.customerId,
          originalAmount,
          discountType,
          discountAmount,
          finalAmount,
          paymentMethod,
        }),
      })
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal-content bg-white rounded-3xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">結帳</h2>
          <p className="text-sm text-muted mb-5">
            {booking.customer.name} · {booking.customer.phone} ·{' '}
            {booking.date} {booking.time}
          </p>

          {/* 服務項目 */}
          <div className="bg-subtle rounded-2xl px-4 py-3 mb-4">
            <p className="text-sm text-gray-700">{services}</p>
          </div>

          {/* 新客優惠 */}
          {booking.customer.isNewCustomer && (
            <button
              onClick={() => setUseNewCustomerDiscount((v) => !v)}
              className={`w-full discount-badge mb-3 transition-all ${
                useNewCustomerDiscount ? 'ring-2 ring-gold' : 'opacity-60'
              }`}
            >
              <span className="text-lg">✨</span>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-gold">新客優惠</p>
                <p className="text-xs text-gray-500">折抵 {formatCurrency(NEW_CUSTOMER_DISCOUNT)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    useNewCustomerDiscount ? 'bg-primary text-white' : 'border-2 border-gray-300'
                  }`}
                >
                  {useNewCustomerDiscount ? '✓' : ''}
                </span>
                <span className="text-sm font-bold text-danger">
                  -{formatCurrency(NEW_CUSTOMER_DISCOUNT)}
                </span>
              </div>
            </button>
          )}

          {/* 儲值金 */}
          {booking.customer.storedValue > 0 && (
            <button
              onClick={() => setUseStoredValue((v) => !v)}
              className={`w-full discount-badge mb-4 transition-all ${
                useStoredValue ? 'ring-2 ring-gold' : 'opacity-60'
              }`}
            >
              <span className="text-lg">💳</span>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-gold">儲值金</p>
                <p className="text-xs text-gray-500">
                  餘額 {formatCurrency(booking.customer.storedValue)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    useStoredValue ? 'bg-primary text-white' : 'border-2 border-gray-300'
                  }`}
                >
                  {useStoredValue ? '✓' : ''}
                </span>
                <span className="text-sm font-bold text-danger">
                  -{formatCurrency(Math.min(booking.customer.storedValue, originalAmount))}
                </span>
              </div>
            </button>
          )}

          {/* 應付金額 */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-sm text-gray-500">應付金額</p>
              {discountAmount > 0 && (
                <p className="text-xs text-muted line-through">
                  原價 {formatCurrency(originalAmount)}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 mr-1">NT$</span>
              <span className="text-3xl font-bold text-gray-800">
                {finalAmount.toLocaleString('zh-TW')}
              </span>
            </div>
          </div>

          {/* 付款方式 */}
          <p className="text-xs text-muted mb-2">付款方式</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setPaymentMethod(pm.key as 'cash' | 'transfer')}
                className={`py-3 rounded-2xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === pm.key
                    ? 'bg-primary text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {pm.emoji} {pm.label}
              </button>
            ))}
          </div>

          {/* 按鈕 */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onCancel} className="btn-outline">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? '處理中…' : '確認結帳'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
