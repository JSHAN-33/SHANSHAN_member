// LINE Messaging API 工具
// 用於發送預約確認、提醒通知給顧客

import { messagingApi } from '@line/bot-sdk'

let _client: messagingApi.MessagingApiClient | null = null

function getClient(): messagingApi.MessagingApiClient {
  if (!_client) {
    _client = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
    })
  }
  return _client
}

/**
 * 發送預約確認訊息給顧客（透過 LINE）
 */
export async function sendBookingConfirmation(params: {
  lineUserId: string
  customerName: string
  date: string
  time: string
  services: string[]
  totalAmount: number
}) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return

  const servicesText = params.services.join('、')
  const message = [
    `✅ 預約確認`,
    ``,
    `您好 ${params.customerName}！`,
    `您的預約已成功！`,
    ``,
    `📅 日期：${params.date}`,
    `🕐 時間：${params.time}`,
    `💆 服務：${servicesText}`,
    `💰 金額：NT$ ${params.totalAmount.toLocaleString('zh-TW')}`,
    ``,
    `如需更改或取消，請直接與我們聯繫。`,
    `期待為您服務 💕`,
  ].join('\n')

  try {
    await getClient().pushMessage({
      to: params.lineUserId,
      messages: [{ type: 'text', text: message }],
    })
  } catch (err) {
    console.error('[LINE] 發送預約確認失敗:', err)
  }
}

/**
 * 發送預約提醒（前一天）
 */
export async function sendBookingReminder(params: {
  lineUserId: string
  customerName: string
  date: string
  time: string
}) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return

  const message = [
    `🔔 預約提醒`,
    ``,
    `您好 ${params.customerName}！`,
    `提醒您明天的預約：`,
    ``,
    `📅 ${params.date} ${params.time}`,
    ``,
    `期待明天為您服務 💕`,
  ].join('\n')

  try {
    await getClient().pushMessage({
      to: params.lineUserId,
      messages: [{ type: 'text', text: message }],
    })
  } catch (err) {
    console.error('[LINE] 發送提醒失敗:', err)
  }
}

/**
 * 驗證 LINE Webhook 簽名
 */
export function validateSignature(body: string, signature: string): boolean {
  const crypto = require('crypto')
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? ''
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}
