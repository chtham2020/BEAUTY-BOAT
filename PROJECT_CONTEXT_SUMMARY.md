# Beauty Boat / Hermes Project Context Summary

Last updated: 2026-06-03

## Workspace

- Local project: `C:\Users\THAM\Documents\New p`
- GitHub repo: `https://github.com/chtham2020/BEAUTY-BOAT.git`
- Current stable branch: `main`
- Latest pushed commit: `97b531c Add Hermes Ollama DeepSeek Telegram alerts`
- Recommended local dev command:
  - `npm run dev -- -p 3010`
- Current working browser URL used during testing:
  - `http://127.0.0.1:3010/`

Important note: running `npm run build` while a Next.js dev server is open can rewrite `.next` and make the old dev server CSS 404. If the website looks like plain HTML, start a fresh dev server on a new port.

## Brand And Company Rules

- Brand: `美人舟`
- English brand: `BEAUTY BOAT`
- Company: `福安` / `FOOK ON`
- Do not use public-facing text containing:
  - `美人丹`
  - `美人洲`
  - `源记`
- Default language should be Traditional Chinese with English toggle.
- Website mood: bright modern 古早味, premium but practical Singapore provision-shop feeling.

## Company Details

- Address: `BLK 551 BEDOK NORTH AVE 1 #01-546 SINGAPORE 460551`
- Phone: `+65 6441 6390`
- PayNow UEN: `25339900M`
- Website contact section includes map/address and PayNow QR.

## Main Website Features

- Next.js App Router + TypeScript.
- Homepage with brand hero, story, product section, 3-image carousel, contact/payment section.
- Products page supports:
  - fixed price products
  - repeat custom blend by vendor code
  - new customer custom blend recipe submission
- Cart and checkout are implemented.
- Checkout defaults:
  - GST: `0%`
  - delivery method: self pickup
- Delivery fee is manual:
  - Lalamove / Grab quoted separately
  - self pickup can be zero but pickup timing still needs shop confirmation

## Hermes Backend

Hermes is built into the same Next.js project with Prisma + SQLite.

Admin routes:

- `/admin/login`
- `/admin/products`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/customers`

Important backend rules:

- Admin can manage products, price, stock, active/inactive status.
- Cancelled orders can be deleted.
- Products can be deleted from inventory when no longer used.
- Customer list is built from orders for repeat order / Bill To usage.
- Cash sale / invoice is printable HTML first, to keep cash spend low.
- Invoice should show FOOK ON / 福安 logo and company details.
- Net weight may use `斤`; 1 斤 = 600g.

## Custom Blend Rules

New customer custom blend:

- Can submit recipe without vendor code.
- Must provide:
  - name or company
  - phone / WhatsApp
  - address or pickup/contact details
- Minimum total weight:
  - 10 斤
  - 6kg
- Must be ordered alone; no other products can be selected in the same cart.
- Quote-only until shop prices ingredient rows and grinding charge.
- 70% deposit applies after quotation.

Repeat custom blend:

- Customer uses vendor code.
- Public frontend must not reveal proprietary formula details.
- Frontend may show only:
  - vendor code
  - verified status
  - total/minimum weight
  - unit
  - generic processing note
- Full formula details are backend-only and may appear in:
  - admin order detail
  - invoice generation
  - AI drafts
  - internal Telegram alerts after order is received

Ingredient selector:

- New customer custom blend has helper catalog:
  - 八角
  - 桂皮
  - 芫荽子
  - 花椒
  - 丁香
  - 甘草
  - 沙姜
  - 小茴
  - 归头
  - 川芎
  - 胡椒子
  - 甘皮
- Customer can still type custom ingredient names.

## Checkout Customer Data Protection

Recent requirement:

- For repeat orders, checkout can help fill name, phone, and address from saved customer dropdown if admin session is available.
- After order submission, frontend form state and customer dropdown state must clear.
- Frontend must not keep name, phone, address in localStorage for data protection.
- Order records still save customer details in backend database.

Implemented file:

- `app/checkout/page.tsx`

## Hermes AI

Current AI provider policy:

- Valid providers only:
  - `ollama`
  - `deepseek`
- Deprecated/invalid:
  - `openai`
  - `deepseek-anthropic`
- Unsupported providers should return a clear admin error.

Ollama/Qwen local mode:

```env
AI_PROVIDER="ollama"
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen2.5:14b"
```

Fast local fallback:

```env
OLLAMA_MODEL="qwen2.5:3b"
```

DeepSeek direct cloud mode:

```env
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

Do not use:

```env
DEEPSEEK_ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
```

AI safety rules:

- AI requests stay server-side only.
- Do not expose DeepSeek keys, Telegram token, or Ollama endpoints to browser code.
- AI output is draft-only:
  - never auto-send WhatsApp
  - never auto-mark payment
  - never auto-confirm delivery fees
  - never auto-confirm pickup/delivery timing
- AI draft generation sends minimal order context.
- AI draft generation should not send customer phone.

Implemented AI files:

- `lib/ai.ts`
- `app/api/admin/ai/order-draft/route.ts`

Ollama was checked locally and showed:

- `qwen2.5:14b`
- `qwen2.5:3b`
- `deepseek-v4-flash:cloud`

## Telegram Urgent Alerts

Telegram is for internal shop urgent alerts only while Android app is not ready.

No Telegram Business account is required. A normal Telegram account + BotFather bot is enough.

Required `.env`:

```env
TELEGRAM_ALERTS_ENABLED="true"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
BEAUTY_BOAT_APP_URL="http://127.0.0.1:3010"
```

Behavior:

- After successful order creation, Hermes sends one Telegram message to the shop.
- Alert includes:
  - order number
  - customer name
  - phone / WhatsApp
  - item summary
  - quote/custom blend status
  - delivery method
  - delivery note
  - subtotal/GST/final total or pending confirmation
  - admin order link when `BEAUTY_BOAT_APP_URL` is set
- Telegram failure must not block checkout or order creation.

Admin test endpoint:

- `POST /api/admin/telegram/test`

Admin UI:

- `/admin/orders/[id]` has `Send Telegram test` button.

Implemented Telegram files:

- `lib/telegram.ts`
- `app/api/admin/telegram/test/route.ts`
- `app/api/orders/route.ts`
- `app/admin/orders/[id]/page.tsx`

## Git Notes

Recent pushed commits:

- `952a886 Protect checkout customer data`
- `97b531c Add Hermes Ollama DeepSeek Telegram alerts`

Before continuing work:

```powershell
git status --short --branch
git pull --ff-only
npm run build
```

If build is run while dev server is open, restart dev server after build:

```powershell
npm run dev -- -p 3011
```

## Suggested First Prompt For A New Codex Window

Use this prompt in the new window:

```text
Please continue the Beauty Boat / Hermes project in C:\Users\THAM\Documents\New p.
First read PROJECT_CONTEXT_SUMMARY.md and AGENTS.md.
Then check git status and continue from the current main branch.
Do not change brand 美人舟 / BEAUTY BOAT or company 福安 / FOOK ON rules.
```

