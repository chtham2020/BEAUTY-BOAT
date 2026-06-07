# 美人舟 / 福安 Website Guide

## Company Facts
- Public brand: 美人舟
- English brand name: BEAUTY BOAT
- Public company name: 福安 in Chinese, FOOK ON in English
- Products: traditional spice powders, including five-spice powder, pepper powder, and custom blended powders
- Address: BLK 551 BEDOK NORTH AVE 1 #01-546 SINGAPORE 460551
- Phone: +65 6441 6390
- PayNow UEN: 25339900M
- Website contact section should include a map for the address.

## Brand Rules
- The brand name must stay 「美人舟」.
- Do not change 「美人舟」 to 「美人丹」 or 「美人洲」.
- Do not use 「源记」 in public-facing website copy.
- Keep 「美人舟」 unchanged in Chinese views.
- Use BEAUTY BOAT as the English brand name.
- Public company name is 福安 in Chinese and FOOK ON in English.
- Default language is Traditional Chinese, with an English toggle.
- Present the brand with a nostalgic Singapore provision-shop feeling, but keep the layout bright, refined, and modern.

## Image Direction
- Keep one carousel image with a 「泛舟美人」 brand motif.
- The other carousel images may use realistic people in spice-making or powder-blending scenes.
- Do not make every image a rafting scene.
- Avoid fake readable text inside generated images.
- Avoid generic stock-photo styling, gradient blobs, overly dark palettes, and loud one-color palettes.

## Design Direction
- Combine 古早味 with modern brightness and clean spacing.
- Use airy cream, light wood, brass, saffron gold, spice red, charcoal ink, and warm paper tones.
- Images should feel premium, editorial, and authentic to traditional spice craft.

## Hermes First Version
- Use the low-cash-spend Hermes setup: Next.js built-in backend, Prisma, and local SQLite.
- Do not connect Lalamove/Grab APIs, WhatsApp API, Stripe, HitPay, or automatic PayNow verification in v1.
- Checkout and admin orders must allow GST 0% or 9%; default can be 0% while the company is non-GST registered.
- Custom Blend deposit should be required for new customers, but can be waived for repeat orders.
- Delivery fee is quoted separately for Lalamove/Grab and manually confirmed by the shop.
- Self pickup can have zero delivery fee, but pickup time still needs shop confirmation.
- Shop follows up orders by manually opening WhatsApp text links or phone links.

## Hermes Customer And Invoice Rules
- Hermes should keep a customer list in the database for repeat orders and Bill To details.
- Cash sale / invoice documents must show the FOOK ON / 福安 logo and company details.
- Invoice format should follow the existing FOOK ON cash sale style: Bill To, date, invoice number, bilingual item table, total, and customer signature area.
- Invoice line net weight may use 「斤」; 1 斤 means 600g.
- PDF creation can begin as a printable HTML/document view that the shop can print or save as PDF, keeping cash spend low.

## Custom Blend Rules
- Customer-supplied custom blends should support ingredient lines with ingredient name/type and quantity in 「斤」.
- The system should show a total weight row in 「斤」 for the whole package before calculating grinding charge.
- Use 1 斤 = 600g. Grinding charge can be stored/displayed as cost per 斤.
- Customer copy examples such as 王祥顺 may show whole-package totals like 20.5斤; Hermes must support decimal quantities such as 20.5.
- Repeat vendor-code formulas are proprietary. The public frontend may verify a vendor code and show only the vendor code, verified status, total/minimum weight, unit, and a generic processing note. It must not expose customer/vendor names, ingredient names, ingredient quantities, prices, grinding charge, heat/process details, or formula details. Full repeat formula details may appear only in backend/admin, invoice generation, AI drafts, and internal alerts after the order is received.

## Hermes AI Experiment
- AI features live only in the `codex/hermes-ai-assistant` worktree until merged.
- Use server-side AI credentials only; never expose API keys to browser code.
- Deprecated: do not use `openai` or `deepseek-anthropic`; see "Hermes AI + Telegram Current Rules" below.
- Current valid AI providers are `ollama` and `deepseek`.
- DeepSeek must use direct `https://api.deepseek.com`; do not use `/anthropic`.
- `AI_API_KEY` and `AI_MODEL` may be used as generic fallbacks when testing one provider at a time.
- AI may generate WhatsApp drafts, internal order summaries, and custom blend quote/supplier inquiry drafts.
- AI output is always a draft for the shop to review; never auto-send WhatsApp, never auto-mark payment, and never auto-confirm delivery fees.
- Send minimum order context to the model: order number, customer name, item summary, totals, delivery method, quote/vendor details, and customer note. Do not send customer phone unless a future feature explicitly requires it.
- AI output must follow brand rules and must not use 「美人丹」, 「美人洲」, or 「源记」.
# Hermes AI + Telegram Current Rules
- Hermes AI supports only `AI_PROVIDER=ollama` and `AI_PROVIDER=deepseek`.
- `openai` and `deepseek-anthropic` are no longer valid Hermes provider choices; unsupported providers should return a clear admin error.
- Local Qwen uses Ollama from the server side only:
  - `OLLAMA_BASE_URL=http://127.0.0.1:11434`
  - `OLLAMA_MODEL=qwen2.5:3b` is the daily low-latency default for Hermes admin drafts.
  - `qwen2.5:14b` may be used for higher-quality local testing, but it can be too slow on CPU-only machines.
- DeepSeek cloud uses the direct OpenAI-compatible DeepSeek API only:
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_MODEL=deepseek-chat`
  - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
  - Do not use `/anthropic`.
- Local Ollama keeps AI processing on the shop PC. DeepSeek sends minimal order context to cloud.
- AI credentials, Telegram bot token, and Ollama calls must stay server-side.
- AI draft generation should not send customer phone. Telegram internal alerts may include customer phone because they are shop-only urgent notifications.
- Telegram is for internal shop alerts only while the Android app is not ready:
  - `TELEGRAM_ALERTS_ENABLED=true`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
- Every successful new order may trigger one Telegram urgent alert with order number, customer name, phone/WhatsApp, item summary, quote status, delivery method/note, totals or pending confirmation, and admin order link.
- Telegram failures must never block checkout or order creation.
- AI output remains draft-only: never auto-send WhatsApp, never auto-mark payment, never auto-confirm delivery fee, and never auto-confirm pickup or delivery timing.
