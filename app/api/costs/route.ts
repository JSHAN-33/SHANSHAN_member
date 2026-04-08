import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/costs?month=YYYY-MM&category=supplies
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  const category = req.nextUrl.searchParams.get('category')

  const records = await db.costRecord.findMany({
    where: {
      ...(month && { date: { startsWith: month } }),
      ...(category && { category }),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(records)
}

// POST /api/costs — 新增費用記錄
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { category, description, amount, date } = body

  if (!category || !amount || !date) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const record = await db.costRecord.create({
    data: {
      category,
      description: description || null,
      amount: Number(amount),
      date,
    },
  })
  return NextResponse.json(record, { status: 201 })
}

// DELETE /api/costs?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  await db.costRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
