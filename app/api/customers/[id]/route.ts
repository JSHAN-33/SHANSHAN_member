import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const customer = await db.customer.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        include: {
          bookingServices: { include: { service: true } },
          transaction: true,
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
      },
      transactions: { orderBy: { paidAt: 'desc' } },
    },
  })
  if (!customer) return NextResponse.json({ error: '找不到顧客' }, { status: 404 })
  return NextResponse.json(customer)
}

// PATCH /api/customers/:id — 更新顧客資料
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { name, phone, birthday, gender, storedValue, notes, isNewCustomer } = body

  const customer = await db.customer.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(birthday !== undefined && { birthday }),
      ...(gender !== undefined && { gender }),
      ...(storedValue !== undefined && { storedValue: Number(storedValue) }),
      ...(notes !== undefined && { notes }),
      ...(isNewCustomer !== undefined && { isNewCustomer }),
    },
  })
  return NextResponse.json(customer)
}

// DELETE /api/customers/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.customer.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
