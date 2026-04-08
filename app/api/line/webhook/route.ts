import { NextRequest, NextResponse } from 'next/server'
import { validateSignature } from '@/lib/line'
import { db } from '@/lib/db'

/**
 * LINE Webhook 接收端點
 * 設定方式：在 LINE Developers Console → Messaging API → Webhook URL 填入：
 * https://your-domain.com/api/line/webhook
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-line-signature') ?? ''
  const body = await req.text()

  // 驗證簽名
  if (!validateSignature(body, signature)) {
    return NextResponse.json({ error: '無效的簽名' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const events = payload.events ?? []

  for (const event of events) {
    await handleEvent(event)
  }

  return NextResponse.json({ ok: true })
}

async function handleEvent(event: Record<string, unknown>) {
  const source = event.source as Record<string, string>
  const lineUserId = source?.userId

  if (!lineUserId) return

  if (event.type === 'follow') {
    // 新好友：記錄 LINE User ID（可用於後續推播）
    console.log(`[LINE] 新好友加入：${lineUserId}`)
  }

  if (event.type === 'message') {
    const msg = event.message as Record<string, string>
    if (msg.type === 'text') {
      await handleTextMessage(lineUserId, msg.text)
    }
  }
}

async function handleTextMessage(lineUserId: string, text: string) {
  // 查詢顧客
  const customer = await db.customer.findUnique({ where: { lineUserId } })

  // 簡單回覆邏輯（可依需求擴充）
  if (text.includes('預約') || text.includes('booking')) {
    // 回覆 LIFF 預約連結
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (liffId) {
      console.log(`[LINE] ${lineUserId} 詢問預約，回傳 LIFF 連結`)
    }
  }

  if (customer) {
    console.log(`[LINE] 訊息來自已知顧客：${customer.name}`)
  }
}
