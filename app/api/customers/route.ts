import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers?search=張
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') ?? ''

  const customers = await db.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(customers)
}

// POST /api/customers — 新增顧客（可同時建立預約）
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name,
    phone,
    birthday,
    gender,
    storedValue,
    notes,
    lineUserId,
    // 同步建立預約（選填）
    booking,
  } = body

  if (!name) {
    return NextResponse.json({ error: '姓名為必填' }, { status: 400 })
  }

  // 建立顧客
  const customer = await db.customer.create({
    data: {
      name,
      phone: phone || null,
      birthday: birthday || null,
      gender: gender || 'unset',
      storedValue: Number(storedValue) || 0,
      notes: notes || null,
      lineUserId: lineUserId || null,
      isNewCustomer: true,
    },
  })

  let newBooking = null

  // 若有提供預約資訊，同步建立
  if (booking?.date && booking?.time && booking?.serviceIds?.length) {
    const services = await db.service.findMany({
      where: { id: { in: booking.serviceIds }, isActive: true },
    })

    newBooking = await db.booking.create({
      data: {
        customerId: customer.id,
        date: booking.date,
        time: booking.time,
        status: 'confirmed',
        bookingServices: {
          create: services.map((s) => ({
            serviceId: s.id,
            price: s.price,
          })),
        },
      },
      include: {
        bookingServices: { include: { service: true } },
      },
    })
  }

  return NextResponse.json({ customer, booking: newBooking }, { status: 201 })
}
