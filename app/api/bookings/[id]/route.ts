import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bookings/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      bookingServices: { include: { service: true } },
      transaction: true,
    },
  })
  if (!booking) return NextResponse.json({ error: '找不到預約' }, { status: 404 })
  return NextResponse.json(booking)
}

// PATCH /api/bookings/:id — 更新狀態或備註
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { status, notes } = body

  const booking = await db.booking.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      customer: true,
      bookingServices: { include: { service: true } },
    },
  })
  return NextResponse.json(booking)
}

// DELETE /api/bookings/:id — 取消預約
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.booking.update({
    where: { id: params.id },
    data: { status: 'cancelled' },
  })
  return NextResponse.json({ ok: true })
}
