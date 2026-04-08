import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendBookingConfirmation } from '@/lib/line'

// GET /api/bookings?date=YYYY-MM-DD&month=YYYY-MM&status=confirmed
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const month = searchParams.get('month')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (date) where.date = date
  if (month) where.date = { startsWith: month }
  if (status) where.status = status

  const bookings = await db.booking.findMany({
    where,
    include: {
      customer: true,
      bookingServices: { include: { service: true } },
      transaction: true,
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  })

  return NextResponse.json(bookings)
}

// POST /api/bookings — 建立新預約
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customerId, date, time, serviceIds, notes } = body

  if (!customerId || !date || !time || !serviceIds?.length) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 確認時段未被佔用或封鎖
  const existing = await db.booking.findFirst({
    where: { date, time, status: { not: 'cancelled' } },
  })
  if (existing) {
    return NextResponse.json({ error: '該時段已被預約' }, { status: 409 })
  }

  const locked = await db.lockedSlot.findUnique({ where: { date_time: { date, time } } })
  if (locked) {
    return NextResponse.json({ error: '該時段已封鎖' }, { status: 409 })
  }

  // 取得服務資訊
  const services = await db.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
  })
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: '部分服務項目不存在' }, { status: 400 })
  }

  const booking = await db.booking.create({
    data: {
      customerId,
      date,
      time,
      notes,
      status: 'confirmed',
      bookingServices: {
        create: services.map((s) => ({
          serviceId: s.id,
          price: s.price,
        })),
      },
    },
    include: {
      customer: true,
      bookingServices: { include: { service: true } },
    },
  })

  // 發送 LINE 確認通知（若顧客有綁定 LINE）
  if (booking.customer.lineUserId) {
    await sendBookingConfirmation({
      lineUserId: booking.customer.lineUserId,
      customerName: booking.customer.name,
      date,
      time,
      services: booking.bookingServices.map((bs) => bs.service.name),
      totalAmount: booking.bookingServices.reduce((s, bs) => s + bs.price, 0),
    })
  }

  return NextResponse.json(booking, { status: 201 })
}
