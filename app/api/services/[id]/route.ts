import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/services/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, price, category, duration, isActive, sortOrder } = body

  const service = await db.service.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(category !== undefined && { category }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
    },
  })
  return NextResponse.json(service)
}

// DELETE /api/services/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // 軟刪除：標記為 inactive
  await db.service.update({
    where: { id: params.id },
    data: { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
