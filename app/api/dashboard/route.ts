import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/dashboard?month=YYYY-MM
 * 回傳儀表板統計數據
 */
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const today = new Date().toISOString().split('T')[0]

  const [
    monthTransactions,
    pendingBookings,
    todayBookings,
  ] = await Promise.all([
    // 本月已結帳
    db.transaction.findMany({
      where: { paidAt: { gte: new Date(`${month}-01`) } },
      include: {
        customer: { select: { name: true, phone: true } },
        booking: {
          include: {
            bookingServices: { include: { service: { select: { name: true } } } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    }),

    // 待結帳（confirmed but no transaction）
    db.booking.findMany({
      where: {
        status: 'confirmed',
        transaction: null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, isNewCustomer: true, storedValue: true } },
        bookingServices: { include: { service: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    }),

    // 今日預約
    db.booking.findMany({
      where: { date: today, status: 'confirmed' },
      include: {
        customer: { select: { name: true, phone: true } },
        bookingServices: { include: { service: { select: { name: true } } } },
      },
      orderBy: { time: 'asc' },
    }),
  ])

  const monthRevenue = monthTransactions.reduce((s, t) => s + t.finalAmount, 0)

  return NextResponse.json({
    month,
    monthCheckoutCount: monthTransactions.length,
    monthRevenue,
    pendingBookings,
    completedTransactions: monthTransactions,
    todayBookings,
    todayCount: todayBookings.length,
  })
}
