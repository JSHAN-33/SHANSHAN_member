'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  alertThreshold: number
  updatedAt: string
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  // 新增表單
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch('/api/inventory')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleAdd = async () => {
    if (!name || quantity === '' || !unit) return
    setSubmitting(true)
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity: Number(quantity), unit, alertThreshold: Number(alertThreshold) }),
    })
    setName('')
    setQuantity('')
    setUnit('')
    setAlertThreshold('0')
    await fetchItems()
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此品項？')) return
    await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
    fetchItems()
  }

  const openEdit = (item: InventoryItem) => {
    setEditItem(item)
    setShowModal(true)
  }

  const lowStockItems = items.filter((i) => i.alertThreshold > 0 && i.quantity <= i.alertThreshold)

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <p className="section-label">庫存管理 · INVENTORY</p>

      {/* ── 新增表單 ── */}
      <div className="card p-4 mb-5">
        <input
          className="input mb-3"
          placeholder="品項名稱（例：蜜蠟、不織布）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="數量"
            type="number"
            min={0}
            step={0.1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            className="input flex-1"
            placeholder="單位"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <input
            className="input w-24"
            placeholder="警戒量"
            type="number"
            min={0}
            step={0.1}
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
          <button
            onClick={handleAdd}
            disabled={submitting || !name || quantity === '' || !unit}
            className="btn-primary shrink-0"
          >
            新增
          </button>
        </div>
      </div>

      {/* ── 庫存不足警示 ── */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-danger mb-2">
            ⚠️ 庫存不足 ({lowStockItems.length} 項)
          </p>
          {lowStockItems.map((i) => (
            <p key={i.id} className="text-xs text-red-600">
              {i.name}：剩餘 {i.quantity} {i.unit}（警戒量 {i.alertThreshold}）
            </p>
          ))}
        </div>
      )}

      {/* ── 品項列表 ── */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">載入中…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-muted text-sm">
          尚無庫存品項，使用上方表單新增
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {items.map((item) => {
            const isLow = item.alertThreshold > 0 && item.quantity <= item.alertThreshold
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isLow ? 'text-danger' : 'text-gray-800'}`}>
                      {item.name}
                    </span>
                    {isLow && (
                      <span className="text-[10px] bg-red-100 text-danger px-1.5 py-0.5 rounded-full">
                        庫存不足
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    警戒量：{item.alertThreshold} {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${isLow ? 'text-danger' : 'text-gray-700'}`}>
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-1"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-muted hover:text-danger text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 編輯 Modal ── */}
      {showModal && editItem && (
        <EditInventoryModal
          item={editItem}
          onSave={() => { setShowModal(false); fetchItems() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── 編輯庫存 Modal ─────────────────────────────────────────────────────────────

function EditInventoryModal({
  item,
  onSave,
  onClose,
}: {
  item: InventoryItem
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [unit, setUnit] = useState(item.unit)
  const [alertThreshold, setAlertThreshold] = useState(String(item.alertThreshold))
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    setSubmitting(true)
    await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        name,
        quantity: Number(quantity),
        unit,
        alertThreshold: Number(alertThreshold),
      }),
    })
    onSave()
  }

  return (
    <div
      className="modal-overlay fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content bg-white rounded-3xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">編輯庫存</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <input
            className="input"
            placeholder="品項名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="數量"
              type="number"
              step={0.1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <input
              className="input"
              placeholder="單位"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <input
            className="input"
            placeholder="警戒量"
            type="number"
            step={0.1}
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="btn-outline">取消</button>
          <button onClick={handleSave} disabled={submitting} className="btn-primary">
            {submitting ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}
