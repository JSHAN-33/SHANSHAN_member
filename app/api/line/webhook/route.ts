/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         LINE Webhook 接收端點                            ║
 * ║                                                          ║
 * ║  流程：LINE 平台 → 這個 API → 解析事件 → 回覆顧客        ║
 * ║                                                          ║
 * ║  在 LINE Developers Console 設定 Webhook URL：           ║
 * ║  https://你的網域.com/api/line/webhook                   ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateSignature } from '@/lib/line'
import { db } from '@/lib/db'
import { messagingApi } from '@line/bot-sdk'

// ─── LINE API 客戶端（單例模式，避免重複初始化）────────────────────────────────
// 每次 Lambda/Serverless 冷啟動時建立一次，之後複用
let lineClient: messagingApi.MessagingApiClient | null = null

function getLineClient() {
  if (!lineClient) {
    lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
    })
  }
  return lineClient
}

// ─── LIFF 預約連結（讓顧客點擊後直接進入預約頁）──────────────────────────────
// 格式：https://liff.line.me/你的LIFF_ID
function getBookingUrl(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) return '（請設定 NEXT_PUBLIC_LIFF_ID）'
  return `https://liff.line.me/${liffId}`
}

// ════════════════════════════════════════════════════════════
//  主要 POST 處理器
//  LINE 每次收到訊息/事件，都會呼叫這個函式
// ════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // 1️⃣ 取得 LINE 傳來的簽名（用來確認請求真的來自 LINE，不是假冒的）
  const signature = req.headers.get('x-line-signature') ?? ''

  // 2️⃣ 讀取 request 的原始內容（必須用 text()，不能用 json()，否則簽名會驗證失敗）
  const rawBody = await req.text()

  // 3️⃣ 驗證簽名：用 LINE_CHANNEL_SECRET 對 rawBody 做 HMAC-SHA256，比對是否相符
  //    若不相符，表示這個請求不是 LINE 發出的 → 拒絕
  if (!validateSignature(rawBody, signature)) {
    console.warn('[Webhook] 簽名驗證失敗，可能是惡意請求')
    return NextResponse.json({ error: '無效的簽名' }, { status: 401 })
  }

  // 4️⃣ 解析 JSON，取出事件陣列
  //    LINE 可能一次送多個事件（例如同時送訊息+已讀）
  const payload = JSON.parse(rawBody)
  const events: Record<string, unknown>[] = payload.events ?? []

  // 5️⃣ 逐一處理每個事件（用 for...of 確保順序執行，不會搶資源）
  for (const event of events) {
    await handleEvent(event)
  }

  // 6️⃣ 回傳 200 OK → LINE 才知道我們收到了，不會重試
  return NextResponse.json({ ok: true })
}

// ════════════════════════════════════════════════════════════
//  事件分流器：根據事件類型決定要做什麼
// ════════════════════════════════════════════════════════════
async function handleEvent(event: Record<string, unknown>) {
  // 取出發送者的 LINE User ID（每位用戶的唯一識別碼）
  const source = event.source as Record<string, string>
  const lineUserId = source?.userId
  if (!lineUserId) return // 若沒有 userId 就略過（例如群組系統訊息）

  // 根據事件類型分流
  switch (event.type) {

    // ── 顧客加好友 ──────────────────────────────────────────
    case 'follow':
      await handleFollow(lineUserId)
      break

    // ── 顧客傳文字訊息 ───────────────────────────────────────
    case 'message': {
      const msg = event.message as Record<string, string>
      if (msg.type === 'text') {
        await handleTextMessage(lineUserId, msg.text)
      }
      break
    }

    // ── 顧客封鎖（取消追蹤）────────────────────────────────
    case 'unfollow':
      console.log(`[Webhook] 顧客封鎖帳號：${lineUserId}`)
      break

    default:
      // 其他事件（位置、貼圖等）目前不處理，直接略過
      break
  }
}

// ════════════════════════════════════════════════════════════
//  處理「加好友」事件
//  新顧客加入時，自動送出歡迎訊息 + 預約連結
// ════════════════════════════════════════════════════════════
async function handleFollow(lineUserId: string) {
  console.log(`[Webhook] 新好友加入：${lineUserId}`)

  // 查詢資料庫中是否已有此顧客（例如之前封鎖又解封）
  const existingCustomer = await db.customer.findUnique({
    where: { lineUserId },
  })

  const name = existingCustomer?.name ?? '您'

  // 發送歡迎訊息
  await replyWithText(lineUserId, [
    `🌸 歡迎加入 SHANSHAN.STUDIO！`,
    ``,
    `您好 ${name}！我是珊珊工作室的預約助理 💕`,
    ``,
    `傳送「預約」即可開始線上預約`,
    `傳送「查詢」可查看您的預約記錄`,
    ``,
    `期待為您打造光滑美肌 ✨`,
  ])
}

// ════════════════════════════════════════════════════════════
//  處理「文字訊息」事件
//  根據顧客傳的內容，決定回覆什麼
// ════════════════════════════════════════════════════════════
async function handleTextMessage(lineUserId: string, text: string) {
  // 查詢顧客資料（看看是否為老顧客）
  const customer = await db.customer.findUnique({
    where: { lineUserId },
    include: {
      // 同時載入最近一筆已確認預約
      bookings: {
        where: { status: 'confirmed' },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        take: 1,
        include: {
          bookingServices: { include: { service: { select: { name: true } } } },
        },
      },
    },
  })

  const bookingUrl = getBookingUrl()

  // ── 關鍵字判斷（不分大小寫）────────────────────────────────

  // 1. 顧客想「預約」
  if (/預約|booking|book|約|appointment/i.test(text)) {
    const greeting = customer ? `${customer.name}，` : ''
    await replyWithText(lineUserId, [
      `📅 ${greeting}點擊下方連結開始預約：`,
      ``,
      bookingUrl,
      ``,
      `🌿 服務項目包含：`,
      `• 腋下除毛`,
      `• 私密肌除毛`,
      `• 腿部除毛`,
      `• 全身多部位組合`,
      ``,
      `✨ 新客首次到訪享 NT$200 優惠！`,
    ])
    return
  }

  // 2. 顧客想「查詢」預約
  if (/查詢|查看|我的預約|check|status/i.test(text)) {
    if (!customer || customer.bookings.length === 0) {
      // 沒有預約記錄
      await replyWithText(lineUserId, [
        `📋 目前查無您的預約記錄`,
        ``,
        `傳送「預約」立即開始預約 👇`,
        bookingUrl,
      ])
    } else {
      // 有預約記錄，顯示最近一筆
      const b = customer.bookings[0]
      const services = b.bookingServices.map((bs) => bs.service.name).join('、')
      await replyWithText(lineUserId, [
        `📋 ${customer.name} 您的最近預約：`,
        ``,
        `📅 日期：${b.date}`,
        `🕐 時間：${b.time}`,
        `💆 服務：${services}`,
        ``,
        `如需更改，請直接聯繫我們 💕`,
      ])
    }
    return
  }

  // 3. 顧客打招呼
  if (/你好|哈囉|嗨|hi|hello|Hey/i.test(text)) {
    const name = customer?.name ?? '您'
    await replyWithText(lineUserId, [
      `嗨 ${name}！我是珊珊工作室的預約助理 🌸`,
      ``,
      `傳送「預約」→ 開始線上預約`,
      `傳送「查詢」→ 查看預約狀態`,
    ])
    return
  }

  // 4. 無法識別的訊息 → 給預設選單
  await replyWithText(lineUserId, [
    `感謝您的訊息 💕`,
    ``,
    `請傳送以下關鍵字：`,
    `📅「預約」→ 線上預約`,
    `📋「查詢」→ 查看我的預約`,
    ``,
    `或直接點此預約：`,
    bookingUrl,
  ])
}

// ════════════════════════════════════════════════════════════
//  工具函式：發送文字訊息給指定 LINE 用戶
//  接受字串陣列，自動用換行符合併
// ════════════════════════════════════════════════════════════
async function replyWithText(lineUserId: string, lines: string[]) {
  // 若沒有設定 LINE_CHANNEL_ACCESS_TOKEN，直接略過（本機開發模式）
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.log(`[Webhook][DEV] 模擬推播給 ${lineUserId}:\n${lines.join('\n')}`)
    return
  }

  try {
    // 呼叫 LINE Messaging API 的 pushMessage
    // push = 主動推播，不需要顧客先說話（相對於 reply 需要 replyToken）
    await getLineClient().pushMessage({
      to: lineUserId,         // 接收者的 LINE User ID
      messages: [
        {
          type: 'text',       // 文字訊息類型
          text: lines.join('\n'), // 把陣列合併成一則訊息
        },
      ],
    })
  } catch (err) {
    // 就算推播失敗，也不要讓 Webhook 整個崩潰
    // LINE 會重試，所以這裡只記錄 log 就好
    console.error('[Webhook] 推播失敗:', err)
  }
}
