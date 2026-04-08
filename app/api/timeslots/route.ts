import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TIME_SLOTS } from '@/lib/utils'

/**
 * GET /api/timeslots?date=YYYY-MM-DD
 * 回傳某天所有時段的狀態
 * status: 'available' | 'locked' | 'booked'
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) {
    return NextResponse.json({ error: '需要 date 參數' }, { status: 400 })
  }

  // 取當日已確認預約
  const bookings = await db.booking.findMany({
    where: { date, status: { not: 'cancelled' } },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      bookingServices: { include: { service: { select: { name: true } } } },
    },
  })

  // 取當日封鎖時段
  const locked = await db.lockedSlot.findMany({ where: { date } })
  const lockedTimes = new Set(locked.map((l) => l.time))

  const bookedMap = new Map(bookings.map((b) => [b.time, b]))

  const slots = TIME_SLOTS.map((time) => {
    if (bookedMap.has(time)) {
      const b = bookedMap.get(time)!
      return {
        time,
        status: 'booked' as const,
        booking: {
          id: b.id,
          customerName: b.customer.name,
          customerPhone: b.customer.phone,
          services: b.bookingServices.map((bs) => bs.service.name),
        },
      }
    }
    if (lockedTimes.has(time)) {
      const lock = locked.find((l) => l.time === time)!
      return { time, status: 'locked' as const, reason: lock.reason }
    }
    return { time, status: 'available' as const }
  })

  return NextResponse.json(slots)
}

/**
 * POST /api/timeslots — 封鎖時段
 * body: { date, time, reason? }
 *
 * DELETE /api/timeslots — 解鎖時段
 * body: { date, time }
 */
export async function POST(req: NextRequest) {
  const { date, time, reason } = await req.json()
  if (!date || !time) {
    return NextResponse.json({ error: '缺少 date 或 time' }, { status: 400 })
  }

  const slot = await db.lockedSlot.upsert({
    where: { date_time: { date, time } },
    create: { date, time, reason },
    update: { reason },
  })
  return NextResponse.json(slot, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { date, time } = await req.json()
  if (!date || !time) {
    return NextResponse.json({ error: '缺少 date 或 time' }, { status: 400 })
  }

  await db.lockedSlot.deleteMany({ where: { date, time } })
  return NextResponse.json({ ok: true })
}
