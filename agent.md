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
- Cart and checkout must show GST 9%.
- Delivery fee is quoted separately for Lalamove/Grab and manually confirmed by the shop.
- Self pickup can have zero delivery fee, but pickup time still needs shop confirmation.
- Shop follows up orders by manually opening WhatsApp text links or phone links.

## Hermes AI Experiment
- AI features live only in the `codex/hermes-ai-assistant` worktree until merged.
- Use server-side AI credentials only; never expose API keys to browser code.
- `AI_PROVIDER` may be `openai`, `deepseek`, or `deepseek-anthropic` in this experiment.
- For OpenAI, use `OPENAI_API_KEY` and `OPENAI_MODEL`; for DeepSeek, use `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_BASE_URL`.
- For DeepSeek Anthropic-compatible mode, use `DEEPSEEK_API_KEY`, `DEEPSEEK_ANTHROPIC_MODEL`, and `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`.
- `AI_API_KEY` and `AI_MODEL` may be used as generic fallbacks when testing one provider at a time.
- AI may generate WhatsApp drafts, internal order summaries, and custom blend quote/supplier inquiry drafts.
- AI output is always a draft for the shop to review; never auto-send WhatsApp, never auto-mark payment, and never auto-confirm delivery fees.
- Send minimum order context to the model: order number, customer name, item summary, totals, delivery method, quote/vendor details, and customer note. Do not send customer phone unless a future feature explicitly requires it.
- AI output must follow brand rules and must not use 「美人丹」, 「美人洲」, or 「源记」.
