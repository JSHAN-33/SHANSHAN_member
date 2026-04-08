# SHANSHAN.STUDIO — LINE 預約與營運管理系統

珊珊工作室熱蠟除毛專屬管理系統，支援 LINE LIFF 線上預約與後台管理。

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    LINE 生態系                           │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │  LINE Bot       │    │  LINE LIFF 顧客預約頁        │ │
│  │  (Webhook)      │    │  /booking                   │ │
│  └────────┬────────┘    └──────────────┬──────────────┘ │
└───────────┼──────────────────────────┼─────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js 應用 (API Routes)               │
│                                                         │
│  /api/bookings     /api/customers   /api/services       │
│  /api/timeslots    /api/costs       /api/inventory      │
│  /api/transactions /api/dashboard  /api/line/webhook    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              SQLite / PostgreSQL (Prisma ORM)            │
│                                                         │
│  Customer  Booking  BookingService  Transaction         │
│  Service   LockedSlot  CostRecord  InventoryItem        │
└─────────────────────────────────────────────────────────┘
```

## 功能模組

### 後台管理 (`/admin`)
| 路由 | 功能 |
|------|------|
| `/admin` | 預約總覽：待結帳、已結帳、行程管理月曆 |
| `/admin/customers` | 顧客管理：新增/編輯、儲值金、預約歷史 |
| `/admin/costs` | 成本記帳：耗材/店租/水電/行銷，依月份分組 |
| `/admin/inventory` | 庫存管理：庫存警示、數量追蹤 |
| `/admin/services` | 服務項目：新增/編輯/上下架 |

### 顧客預約 (`/booking`)
- LINE LIFF 整合，自動取得顧客 LINE ID
- 步驟式預約流程：選服務 → 選日期時間 → 確認
- 新客優惠說明

### 結帳功能
- 新客優惠折抵（預設 NT$200）
- 儲值金折抵
- 現金 / 轉帳
- 自動更新顧客新客狀態

### LINE 通知
- 預約確認訊息（自動推播）
- 預約提醒（可設定排程）

## 快速啟動

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
```bash
cp .env.example .env
# 編輯 .env，填入必要設定
```

### 3. 建立資料庫
```bash
npm run db:push        # 建立資料表
npm run db:seed        # 植入預設服務項目
```

### 4. 啟動開發伺服器
```bash
npm run dev
# 後台管理：http://localhost:3000/admin
# 顧客預約：http://localhost:3000/booking
```

## 部署（Vercel）

1. 推送到 GitHub
2. 在 Vercel 導入專案，設定環境變數（`DATABASE_URL` 改用 PostgreSQL）
3. 部署完成後，在 LINE Developers Console 設定：
   - **Webhook URL**: `https://your-domain.com/api/line/webhook`
   - **LIFF URL**: `https://your-domain.com/booking`

## 環境變數

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | SQLite 或 PostgreSQL 連線字串 |
| `ADMIN_PASSWORD` | 後台密碼（目前用於基本保護） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID |
| `NEXT_PUBLIC_NEW_CUSTOMER_DISCOUNT` | 新客優惠金額（預設 200） |

## 資料模型

```
Customer (顧客)
  ├── Booking[] (預約)
  │     ├── BookingService[] → Service (服務項目)
  │     └── Transaction (結帳紀錄)
  └── Transaction[]

LockedSlot     -- 封鎖時段
CostRecord     -- 成本記錄
InventoryItem  -- 庫存品項
```
