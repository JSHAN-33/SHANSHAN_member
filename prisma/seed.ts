import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始植入預設資料...')

  // ─── 女生服務項目 ────────────────────────────────────────────────────────────
  const femaleServices = [
    { name: '腋下X私密肌除毛', price: 2000, duration: 60, sortOrder: 1 },
    { name: '告別毛手毛腳', price: 3000, duration: 90, sortOrder: 2 },
    { name: '腋下除毛', price: 800, duration: 30, sortOrder: 3 },
    { name: '私密肌除毛', price: 1500, duration: 45, sortOrder: 4 },
    { name: '小腿除毛', price: 1200, duration: 40, sortOrder: 5 },
    { name: '大腿除毛', price: 1500, duration: 50, sortOrder: 6 },
    { name: '全腿除毛', price: 2500, duration: 80, sortOrder: 7 },
    { name: '手臂除毛', price: 1200, duration: 40, sortOrder: 8 },
    { name: '唇毛除毛', price: 500, duration: 20, sortOrder: 9 },
    { name: '比基尼線除毛', price: 1000, duration: 30, sortOrder: 10 },
  ]

  for (const s of femaleServices) {
    await prisma.service.upsert({
      where: { id: `female-${s.sortOrder}` },
      update: {},
      create: {
        id: `female-${s.sortOrder}`,
        category: 'female',
        isActive: true,
        ...s,
      },
    })
  }

  // ─── 男生服務項目 ────────────────────────────────────────────────────────────
  const maleServices = [
    { name: '背部除毛', price: 2000, duration: 60, sortOrder: 1 },
    { name: '胸部除毛', price: 1500, duration: 45, sortOrder: 2 },
    { name: '腋下除毛（男）', price: 800, duration: 30, sortOrder: 3 },
    { name: '小腿除毛（男）', price: 1200, duration: 40, sortOrder: 4 },
  ]

  for (const s of maleServices) {
    await prisma.service.upsert({
      where: { id: `male-${s.sortOrder}` },
      update: {},
      create: {
        id: `male-${s.sortOrder}`,
        category: 'male',
        isActive: true,
        ...s,
      },
    })
  }

  // ─── 產品 ───────────────────────────────────────────────────────────────────
  const productServices = [
    { name: '煥白明亮護理軟糖膜', price: 1100, duration: 0, sortOrder: 1 },
    { name: '深層保濕修護霜', price: 800, duration: 0, sortOrder: 2 },
    { name: '舒緩鎮定精華', price: 1200, duration: 0, sortOrder: 3 },
  ]

  for (const s of productServices) {
    await prisma.service.upsert({
      where: { id: `product-${s.sortOrder}` },
      update: {},
      create: {
        id: `product-${s.sortOrder}`,
        category: 'product',
        isActive: true,
        ...s,
      },
    })
  }

  console.log('✅ 預設服務項目植入完成')
  console.log(`   女生：${femaleServices.length} 項`)
  console.log(`   男士：${maleServices.length} 項`)
  console.log(`   產品：${productServices.length} 項`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
