'use client'

import { useState, useEffect } from 'react'
import { SERVICE_CATEGORIES, formatCurrency } from '@/lib/utils'

interface Service {
  id: string
  name: string
  price: number
  category: string
  duration: number
  isActive: boolean
  sortOrder: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'female' | 'male' | 'product'>('female')
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)

  const fetchServices = async () => {
    setLoading(true)
    const res = await fetch('/api/services?activeOnly=false')
    const data = await res.json()
    setServices(data)
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  const filteredServices = services.filter((s) => s.category === activeTab)

  const openNew = () => { setEditService(null); setShowModal(true) }
  const openEdit = (s: Service) => { setEditService(s); setShowModal(true) }

  const toggleActive = async (s: Service) => {
    await fetch(`/api/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    fetchServices()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label mb-0">服務項目管理</p>
        <button onClick={openNew} className="btn-primary text-sm py-2 px-4">
          + 新增
        </button>
      </div>

      {/* 分類 Tab */}
      <div className="flex bg-subtle rounded-xl p-1 mb-4">
        {SERVICE_CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'female' | 'male' | 'product')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-white text-primary shadow-sm' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">載入中…</div>
      ) : filteredServices.length === 0 ? (
        <div className="card p-8 text-center text-muted text-sm">
          此分類尚無服務項目
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {filteredServices.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 ${
                !s.isActive ? 'opacity-40' : ''
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {s.duration > 0 ? `${s.duration} 分鐘` : '產品'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-gray-700">
                  {formatCurrency(s.price)}
                </span>
                <button
                  onClick={() => toggleActive(s)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                    s.isActive
                      ? 'border-available text-available'
                      : 'border-gray-200 text-muted'
                  }`}
                >
                  {s.isActive ? '上架' : '下架'}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-1"
                >
                  編輯
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ServiceModal
          service={editService}
          defaultCategory={activeTab}
          onSave={() => { setShowModal(false); fetchServices() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── 服務 Modal ────────────────────────────────────────────────────────────────

function ServiceModal({
  service,
  defaultCategory,
  onSave,
  onClose,
}: {
  service: Service | null
  defaultCategory: string
  onSave: () => void
  onClose: () => void
}) {
  const isNew = !service
  const [name, setName] = useState(service?.name ?? '')
  const [price, setPrice] = useState(String(service?.price ?? ''))
  const [category, setCategory] = useState(service?.category ?? defaultCategory)
  const [duration, setDuration] = useState(String(service?.duration ?? 60))
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    if (!name || !price) return
    setSubmitting(true)
    if (isNew) {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price: Number(price), category, duration: Number(duration) }),
      })
    } else {
      await fetch(`/api/services/${service!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price: Number(price), category, duration: Number(duration) }),
      })
    }
    onSave()
  }

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content bg-white rounded-3xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isNew ? '新增服務' : '編輯服務'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <input
            className="input"
            placeholder="服務名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="售價 NT$"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {SERVICE_CATEGORIES.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="時長（分鐘）"
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-outline">取消</button>
          <button onClick={handleSave} disabled={submitting || !name || !price} className="btn-primary">
            {submitting ? '儲存中…' : isNew ? '新增' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}
