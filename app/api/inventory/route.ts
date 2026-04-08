import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory
export async function GET() {
  const items = await db.inventoryItem.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(items)
}

// POST /api/inventory — 新增庫存品項
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, quantity, unit, alertThreshold } = body

  if (!name || quantity === undefined || !unit) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const item = await db.inventoryItem.create({
    data: {
      name,
      quantity: Number(quantity),
      unit,
      alertThreshold: Number(alertThreshold) || 0,
    },
  })
  return NextResponse.json(item, { status: 201 })
}

// PATCH /api/inventory — 更新品項（id 在 body）
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, name, quantity, unit, alertThreshold } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const item = await db.inventoryItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(quantity !== undefined && { quantity: Number(quantity) }),
      ...(unit !== undefined && { unit }),
      ...(alertThreshold !== undefined && { alertThreshold: Number(alertThreshold) }),
    },
  })
  return NextResponse.json(item)
}

// DELETE /api/inventory?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  await db.inventoryItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
