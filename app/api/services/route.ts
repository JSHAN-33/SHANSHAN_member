import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/services?category=female&activeOnly=true
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') !== 'false'

  const services = await db.service.findMany({
    where: {
      ...(category && { category }),
      ...(activeOnly && { isActive: true }),
    },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })
  return NextResponse.json(services)
}

// POST /api/services — 新增服務項目
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, price, category, duration, sortOrder } = body

  if (!name || !price || !category) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const service = await db.service.create({
    data: {
      name,
      price: Number(price),
      category,
      duration: Number(duration) || 60,
      sortOrder: Number(sortOrder) || 0,
    },
  })
  return NextResponse.json(service, { status: 201 })
}
