'use client'

/**
 * 顧客預約頁面（LINE LIFF）
 * 部署後需在 LINE Developers Console 設定 LIFF URL
 * NEXT_PUBLIC_LIFF_ID 填入 LIFF ID
 */

import { useState, useEffect } from 'react'
import {
  formatCurrency,
  formatDate,
  getTodayString,
  toDateString,
  getDaysInMonth,
  TIME_SLOTS,
  SERVICE_CATEGORIES,
  WEEKDAY_LABELS,
  NEW_CUSTOMER_DISCOUNT,
} from '@/lib/utils'

type Step = 'service' | 'datetime' | 'confirm' | 'done'

interface Service {
  id: string
  name: string
  price: number
  category: string
  duration: number
}

interface TimeSlot {
  time: string
  status: 'available' | 'locked' | 'booked'
}

// LIFF SDK 的型別聲明（由 CDN 注入）
declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      login: () => void
      getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>
      isInClient: () => boolean
    }
  }
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>('service')
  const [liffReady, setLiffReady] = useState(false)
  const [lineProfile, setLineProfile] = useState<{ userId: string; displayName: string } | null>(null)

  // 預約資料
  const [serviceTab, setServiceTab] = useState<'female' | 'male' | 'product'>('female')
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  // 顧客資料（若已有紀錄則預填）
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [customerNote, setCustomerNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)

  const today = getTodayString()

  // ── 初始化 LIFF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      // 無 LIFF ID：開發模式，直接進入
      setLiffReady(true)
      return
    }

    // 載入 LIFF SDK
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.onload = async () => {
      try {
        await window.liff.init({ liffId })
        if (!window.liff.isLoggedIn()) {
          window.liff.login()
          return
        }
        const profile = await window.liff.getProfile()
        setLineProfile(profile)
        setName(profile.displayName)
        // 查詢既有顧客資料
        const res = await fetch(`/api/customers?search=${profile.userId}`)
        // （若後端支援以 lineUserId 查詢可進一步預填）
      } catch (err) {
        console.error('LIFF init error:', err)
      } finally {
        setLiffReady(true)
      }
    }
    document.head.appendChild(script)
  }, [])

  // ── 取得服務列表 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then(setServices)
  }, [])

  // ── 取得時段 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDate) return
    fetch(`/api/timeslots?date=${selectedDate}`)
      .then((r) => r.json())
      .then(setTimeSlots)
  }, [selectedDate])

  // ── 服務操作 ──────────────────────────────────────────────────────────────────
  const filteredServices = services.filter((s) => s.category === serviceTab)
  const selectedServiceObjects = services.filter((s) => selectedServices.includes(s.id))
  const totalAmount = selectedServiceObjects.reduce((s, sv) => s + sv.price, 0)

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // ── 日曆 ──────────────────────────────────────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7))
  const [ym] = calendarMonth.split('-').map(Number)
  const calMonth = parseInt(calendarMonth.split('-')[1])
  const calYear = parseInt(calendarMonth.split('-')[0])
  const calDays = getDaysInMonth(calYear, calMonth)
  const firstDay = calDays[0].getDay()

  // ── 提交預約 ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name || !selectedDate || !selectedTime || !selectedServices.length) return
    setSubmitting(true)

    try {
      // 1. 尋找或建立顧客
      let customerId: string

      if (lineProfile) {
        // 有 LINE 帳號：嘗試以 lineUserId 查詢
        const existing = await fetch(`/api/customers`)
          .then((r) => r.json())
          .then((list: { id: string; lineUserId: string | null }[]) =>
            list.find((c) => c.lineUserId === lineProfile.userId)
          )

        if (existing) {
          customerId = existing.id
        } else {
          const created = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              phone,
              lineUserId: lineProfile.userId,
              notes: customerNote,
            }),
          }).then((r) => r.json())
          customerId = created.customer.id
        }
      } else {
        // 開發模式：以姓名 + 電話建立顧客
        const created = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, notes: customerNote }),
        }).then((r) => r.json())
        customerId = created.customer.id
      }

      // 2. 建立預約
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServices,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? '預約失敗，請再試一次')
        return
      }

      const booking = await res.json()
      setBookingId(booking.id)
      setStep('done')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 畫面 ──────────────────────────────────────────────────────────────────────

  if (!liffReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">載入中…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* 標題 */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 text-center">
        <h1 className="font-bold text-primary tracking-wider text-base">SHANSHAN.STUDIO</h1>
        <p className="text-xs text-muted mt-0.5">線上預約</p>
      </header>

      {/* 步驟指示器 */}
      {step !== 'done' && (
        <div className="flex justify-center gap-2 py-4 px-4">
          {(['service', 'datetime', 'confirm'] as const).map((s, i) => {
            const stepIdx = ['service', 'datetime', 'confirm'].indexOf(step)
            const active = i <= stepIdx
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div className={`w-8 h-0.5 ${active && stepIdx > i ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pb-24">

        {/* ── STEP 1：選服務 ── */}
        {step === 'service' && (
          <div>
            <h2 className="text-base font-bold mb-3">選擇服務</h2>

            {/* 分類 Tab */}
            <div className="flex bg-subtle rounded-xl p-1 mb-4">
              {SERVICE_CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setServiceTab(key as 'female' | 'male' | 'product')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    serviceTab === key ? 'bg-white text-primary shadow-sm' : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredServices.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-sm transition-all ${
                    selectedServices.includes(s.id)
                      ? 'bg-primary/10 border-2 border-primary text-primary'
                      : 'bg-white border-2 border-transparent text-gray-700'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">{s.name}</p>
                    {s.duration > 0 && (
                      <p className="text-xs text-muted mt-0.5">約 {s.duration} 分鐘</p>
                    )}
                  </div>
                  <span className="font-bold">{formatCurrency(s.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2：選日期時間 ── */}
        {step === 'datetime' && (
          <div>
            <h2 className="text-base font-bold mb-3">選擇日期與時間</h2>

            {/* 月份切換 */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  const d = new Date(calYear, calMonth - 2, 1)
                  setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                disabled={calendarMonth <= today.slice(0, 7)}
              >
                ‹
              </button>
              <span className="text-sm font-semibold">
                {calYear} 年 {calMonth} 月
              </span>
              <button
                onClick={() => {
                  const d = new Date(calYear, calMonth, 1)
                  setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ›
              </button>
            </div>

            {/* 月曆 */}
            <div className="card p-3 mb-4">
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs text-muted py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                {calDays.map((d) => {
                  const ds = toDateString(d)
                  const past = ds < today
                  return (
                    <button
                      key={ds}
                      onClick={() => { if (!past) setSelectedDate(ds) }}
                      disabled={past}
                      className={`aspect-square flex items-center justify-center rounded-xl text-sm transition-colors
                        ${past ? 'text-gray-200 cursor-not-allowed' : ''}
                        ${ds === selectedDate ? 'bg-primary text-white font-bold' : ''}
                        ${ds !== selectedDate && !past ? 'hover:bg-gray-100 text-gray-700' : ''}
                      `}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 時段 */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">{formatDate(selectedDate)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.status === 'available' && setSelectedTime(slot.time)}
                      disabled={slot.status !== 'available'}
                      className={`rounded-2xl p-3 text-center transition-all
                        ${slot.status === 'available' && selectedTime === slot.time
                          ? 'bg-primary text-white border-2 border-primary'
                          : slot.status === 'available'
                          ? 'slot-available'
                          : 'slot-locked opacity-40 cursor-not-allowed'
                        }
                      `}
                    >
                      <p className="font-semibold text-sm">{slot.time}</p>
                      <p className="text-xs mt-0.5">
                        {slot.status === 'available' ? '空檔' : slot.status === 'booked' ? '已預約' : '封鎖'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3：確認 ── */}
        {step === 'confirm' && (
          <div>
            <h2 className="text-base font-bold mb-4">確認預約</h2>

            {/* 預約摘要 */}
            <div className="card p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">日期</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">時間</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="border-t pt-3">
                  {selectedServiceObjects.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm py-0.5">
                      <span>{s.name}</span>
                      <span className="text-gray-500">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-sm border-t pt-3">
                  <span>合計</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                <p className="text-xs text-gold">
                  ✨ 新客可享 {formatCurrency(NEW_CUSTOMER_DISCOUNT)} 優惠，結帳時適用
                </p>
              </div>
            </div>

            {/* 顧客資料 */}
            <div className="space-y-3">
              <input
                className="input"
                placeholder="您的姓名（必填）"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="input"
                placeholder="手機號碼"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <textarea
                className="input resize-none"
                placeholder="備註（特殊需求、膚質…）"
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── STEP 4：完成 ── */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-primary mb-2">預約成功！</h2>
            <p className="text-sm text-gray-600 mb-1">
              {formatDate(selectedDate)} {selectedTime}
            </p>
            <p className="text-sm text-muted mb-6">
              {selectedServiceObjects.map((s) => s.name).join('、')}
            </p>
            <div className="card p-4 text-left text-sm mb-6">
              <p className="text-muted text-xs mb-2">預約摘要</p>
              <p className="font-medium">{name}</p>
              {phone && <p className="text-muted">{phone}</p>}
              <p className="text-primary font-bold mt-2">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-gold mt-1">
                ✨ 新客優惠 -{formatCurrency(NEW_CUSTOMER_DISCOUNT)} 將於結帳時折抵
              </p>
            </div>
            <p className="text-xs text-muted">
              如需更改或取消，請透過 LINE 聯繫我們
            </p>
          </div>
        )}

      </div>

      {/* ── 底部操作列 ── */}
      {step !== 'done' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-md mx-auto flex gap-3">
            {step !== 'service' && (
              <button
                onClick={() => {
                  const prev: Record<Step, Step> = { service: 'service', datetime: 'service', confirm: 'datetime', done: 'confirm' }
                  setStep(prev[step])
                }}
                className="btn-outline flex-1"
              >
                上一步
              </button>
            )}
            <button
              onClick={() => {
                if (step === 'service') {
                  if (!selectedServices.length) { alert('請至少選擇一項服務'); return }
                  setStep('datetime')
                } else if (step === 'datetime') {
                  if (!selectedDate || !selectedTime) { alert('請選擇日期與時間'); return }
                  setStep('confirm')
                } else if (step === 'confirm') {
                  handleSubmit()
                }
              }}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {step === 'confirm'
                ? submitting
                  ? '送出中…'
                  : '確認預約'
                : '下一步'}
            </button>
          </div>

          {/* 小計 */}
          {selectedServices.length > 0 && step !== 'confirm' && (
            <p className="text-center text-xs text-muted mt-2">
              已選 {selectedServices.length} 項 · {formatCurrency(totalAmount)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
