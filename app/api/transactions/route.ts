import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transactions?month=YYYY-MM
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')

  const transactions = await db.transaction.findMany({
    where: month
      ? {
          paidAt: {
            gte: new Date(`${month}-01`),
            lt: new Date(
              month.endsWith('-12')
                ? `${Number(month.split('-')[0]) + 1}-01-01`
                : `${month.split('-')[0]}-${String(Number(month.split('-')[1]) + 1).padStart(2, '0')}-01`
            ),
          },
        }
      : undefined,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      booking: {
        include: {
          bookingServices: { include: { service: { select: { name: true } } } },
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  })

  return NextResponse.json(transactions)
}

/**
 * POST /api/transactions — 結帳
 * body: {
 *   bookingId,
 *   customerId,
 *   originalAmount,
 *   discountType?,     // 'newCustomer' | 'storedValue' | 'manual'
 *   discountAmount,
 *   finalAmount,
 *   paymentMethod,     // 'cash' | 'transfer'
 *   note?
 * }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    bookingId,
    customerId,
    originalAmount,
    discountType,
    discountAmount,
    finalAmount,
    paymentMethod,
    note,
  } = body

  if (!customerId || finalAmount === undefined || !paymentMethod) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 使用交易確保一致性
  const [transaction] = await db.$transaction([
    // 建立結帳紀錄
    db.transaction.create({
      data: {
        bookingId: bookingId || null,
        customerId,
        originalAmount: Number(originalAmount),
        discountType: discountType || null,
        discountAmount: Number(discountAmount) || 0,
        finalAmount: Number(finalAmount),
        paymentMethod,
        note: note || null,
      },
    }),

    // 更新預約狀態為已完成
    ...(bookingId
      ? [
          db.booking.update({
            where: { id: bookingId },
            data: { status: 'completed' },
          }),
        ]
      : []),

    // 若使用新客優惠，將 isNewCustomer 改為 false
    ...(discountType === 'newCustomer'
      ? [
          db.customer.update({
            where: { id: customerId },
            data: { isNewCustomer: false },
          }),
        ]
      : []),

    // 若使用儲值金，扣除餘額
    ...(discountType === 'storedValue' && discountAmount > 0
      ? [
          db.customer.update({
            where: { id: customerId },
            data: { storedValue: { decrement: Number(discountAmount) } },
          }),
        ]
      : []),
  ])

  return NextResponse.json(transaction, { status: 201 })
}
