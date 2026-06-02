import { formatMoney } from "./money";

type TelegramOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerNote: string | null;
  deliveryMethod: string;
  deliveryNote: string | null;
  subtotalCents: number;
  gstRate: number;
  gstCents: number;
  deliveryFeeCents: number | null;
  finalTotalCents: number | null;
  hasQuoteItems: boolean;
  depositRequired: boolean;
  items: {
    productNameZh: string;
    productNameEn: string;
    unit: string;
    quantity: number;
    lineTotalCents: number | null;
    quoteOnly: boolean;
    vendorCode: string | null;
    blendType: string | null;
  }[];
};

function telegramEnabled() {
  return process.env.TELEGRAM_ALERTS_ENABLED?.toLowerCase() === "true";
}

function telegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured");
  }
  return { botToken, chatId };
}

function appUrl() {
  return (process.env.BEAUTY_BOAT_APP_URL || "").replace(/\/$/, "");
}

function deliveryLabel(value: string) {
  return value === "self-pickup" ? "Self pickup / 自费领取" : "Lalamove / Grab delivery";
}

function totalLabel(order: TelegramOrder) {
  return order.finalTotalCents == null || order.hasQuoteItems ? "Pending shop confirmation / 待店家确认" : formatMoney(order.finalTotalCents);
}

function itemSummary(order: TelegramOrder) {
  return order.items
    .map((item) => {
      const quoteLabel = item.quoteOnly || item.lineTotalCents == null ? "quote pending" : formatMoney(item.lineTotalCents);
      const custom = item.vendorCode ? ` | vendor code ${item.vendorCode}` : item.blendType ? ` | ${item.blendType}` : "";
      return `- ${item.productNameZh} / ${item.productNameEn} x ${item.quantity} ${item.unit}${custom}: ${quoteLabel}`;
    })
    .join("\n");
}

export function buildTelegramOrderAlert(order: TelegramOrder) {
  const adminLink = appUrl() ? `${appUrl()}/admin/orders/${order.id}` : "";
  return [
    "URGENT NEW ORDER - BEAUTY BOAT 美人舟 / FOOK ON 福安",
    "",
    `Order: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone/WhatsApp: ${order.customerPhone}`,
    `Delivery: ${deliveryLabel(order.deliveryMethod)}`,
    `Delivery note: ${order.deliveryNote || "none"}`,
    `Customer note: ${order.customerNote || "none"}`,
    "",
    "Items:",
    itemSummary(order),
    "",
    `Subtotal: ${formatMoney(order.subtotalCents)}`,
    `GST ${order.gstRate}%: ${formatMoney(order.gstCents)}`,
    `Delivery fee: ${order.deliveryFeeCents == null ? "Quoted separately / 另计" : formatMoney(order.deliveryFeeCents)}`,
    `Final total: ${totalLabel(order)}`,
    `Custom blend status: ${order.hasQuoteItems ? "Quote/final amount pending" : "Fixed-price order"}`,
    `Deposit: ${order.depositRequired ? "70% applies after quotation for new custom blend" : "Not required / waived unless shop confirms"}`,
    adminLink ? `Admin: ${adminLink}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendTelegramMessage(text: string) {
  const { botToken, chatId } = telegramConfig();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details.slice(0, 240)}`);
  }
}

export async function sendTelegramOrderAlert(order: TelegramOrder) {
  if (!telegramEnabled()) return;
  await sendTelegramMessage(buildTelegramOrderAlert(order));
}

export async function sendTelegramTestMessage() {
  if (!telegramEnabled()) {
    throw new Error("TELEGRAM_ALERTS_ENABLED is not true");
  }
  await sendTelegramMessage(`Telegram test from BEAUTY BOAT 美人舟 / FOOK ON 福安 at ${new Date().toISOString()}`);
}
