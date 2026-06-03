import OpenAI from "openai";
import { formatMoney } from "./money";

export type AiDraftKind = "whatsapp" | "summary" | "quote";
type AiProvider = "ollama" | "deepseek";

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);

type AiOrder = {
  orderNumber: string;
  customerName: string;
  customerNote: string | null;
  deliveryMethod: string;
  deliveryNote: string | null;
  status: string;
  subtotalCents: number;
  gstCents: number;
  deliveryFeeCents: number | null;
  finalTotalCents: number | null;
  hasQuoteItems: boolean;
  items: {
    productNameZh: string;
    productNameEn: string;
    unit: string;
    quantity: number;
    unitPriceCents: number | null;
    lineTotalCents: number | null;
    quoteOnly: boolean;
    vendorCode: string | null;
    vendorName: string | null;
    blendType: string | null;
    ingredients: string | null;
    ingredientQuantity: string | null;
    heatTreatment: string | null;
    processSpec: string | null;
    grindingCostPer600gCents: number | null;
    minimumQuantityKg: number | null;
    depositCents: number | null;
    balanceCents: number | null;
  }[];
};

const kindLabels: Record<AiDraftKind, string> = {
  whatsapp: "WhatsApp customer follow-up draft",
  summary: "Internal order summary",
  quote: "Custom blend quote or supplier inquiry draft",
};

function describeMoney(cents: number | null) {
  return cents == null ? "pending confirmation" : formatMoney(cents);
}

function minimalOrderContext(order: AiOrder) {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    customerNote: order.customerNote || "none",
    deliveryMethod: order.deliveryMethod,
    deliveryNote: order.deliveryNote || "none",
    subtotal: formatMoney(order.subtotalCents),
    gst: formatMoney(order.gstCents),
    deliveryFee: describeMoney(order.deliveryFeeCents),
    finalTotal: describeMoney(order.finalTotalCents),
    hasQuoteItems: order.hasQuoteItems,
    items: order.items.map((item) => ({
      nameZh: item.productNameZh,
      nameEn: item.productNameEn,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: describeMoney(item.unitPriceCents),
      lineTotal: describeMoney(item.lineTotalCents),
      quoteOnly: item.quoteOnly,
      vendorCode: item.vendorCode,
      vendorName: item.vendorName,
      blendType: item.blendType,
      ingredients: item.ingredients,
      ingredientQuantity: item.ingredientQuantity,
      heatTreatment: item.heatTreatment,
      processSpec: item.processSpec,
      grindingCostPer600g: describeMoney(item.grindingCostPer600gCents),
      minimumQuantityKg: item.minimumQuantityKg,
      deposit70Percent: describeMoney(item.depositCents),
      collectionBalance30Percent: describeMoney(item.balanceCents),
    })),
  };
}

function instructionsFor(kind: AiDraftKind) {
  const task =
    kind === "whatsapp"
      ? "Write a concise Chinese WhatsApp follow-up draft for the customer. Mention the order number, confirmation status, GST, delivery fee or pickup arrangement needing shop confirmation, and PayNow UEN 25339900M only after confirmation. Do not include the customer's phone number."
      : kind === "summary"
        ? "Write a concise internal Chinese order summary for the shop owner. Use bullets. Highlight quote items, delivery/payment follow-up, and any customer note."
        : "Write a concise Chinese custom blend quote or supplier inquiry draft for shop staff. Include vendor code/name if present, blend details, quantity, deposit/balance if available, and what still needs manual confirmation.";

  return [
    "You are the Hermes assistant for 福安 / FOOK ON in Singapore. BEAUTY BOAT 美人舟 is the brand; 福安 / FOOK ON is the company.",
    "Brand rules: the brand must be 美人舟 or BEAUTY BOAT only, and the company must be 福安 or FOOK ON. Never write 美人丹, 美人洲, or 源记.",
    "Tone: polite, clear, practical, like a Singapore local provision shop following up with a customer or supplier.",
    "Operational rules: GST may be 0% or 9% according to the order. Delivery fee is quoted separately for Lalamove/Grab. Self pickup timing still needs shop confirmation. PayNow payment is manually verified by the shop. Do not claim payment is confirmed unless the order context says so.",
    "AI output is draft-only. Never auto-send WhatsApp, never auto-mark payment, never auto-confirm delivery fees, and never auto-confirm pickup or delivery timing.",
    "Output only the draft text. No markdown table.",
    task,
  ].join("\n");
}

function safeOutput(text: string) {
  return text
    .replaceAll("美人丹", "美人舟")
    .replaceAll("美人洲", "美人舟")
    .replaceAll("源记", "福安")
    .trim();
}

function itemLines(order: AiOrder) {
  return order.items
    .map((item) => {
      const amount = item.lineTotalCents == null ? "待确认" : formatMoney(item.lineTotalCents);
      const custom = item.vendorCode ? `，Vendor code: ${item.vendorCode}` : item.quoteOnly ? "，询价项目" : "";
      return `- ${item.productNameZh} / ${item.productNameEn} x ${item.quantity}${item.unit}${custom}：${amount}`;
    })
    .join("\n");
}

function fallbackDraft(kind: AiDraftKind, order: AiOrder, reason: string) {
  const total = order.finalTotalCents == null || order.hasQuoteItems ? "最终金额待店家确认" : formatMoney(order.finalTotalCents);
  const delivery = order.deliveryMethod === "self-pickup" ? "自费领取 / Self pickup" : "Lalamove / Grab 配送";

  if (kind === "whatsapp") {
    return safeOutput([
      `您好 ${order.customerName}，这里是福安，BEAUTY BOAT 美人舟品牌。`,
      `我们已收到订单 ${order.orderNumber}。`,
      "",
      itemLines(order),
      "",
      `商品小计：${formatMoney(order.subtotalCents)}`,
      `GST：${formatMoney(order.gstCents)}`,
      `运输方式：${delivery}`,
      `总额：${total}`,
      "运输费、取货时间和 PayNow 付款会由店家确认后再通知。谢谢。",
      "",
      `[Hermes fallback draft: ${reason}]`,
    ].join("\n"));
  }

  if (kind === "summary") {
    return safeOutput([
      `订单摘要：${order.orderNumber}`,
      `客户：${order.customerName}`,
      `状态：${order.status}`,
      `运输：${delivery}`,
      `备注：${order.customerNote || "无"}`,
      "",
      "商品：",
      itemLines(order),
      "",
      `小计：${formatMoney(order.subtotalCents)}`,
      `GST：${formatMoney(order.gstCents)}`,
      `最终金额：${total}`,
      order.hasQuoteItems ? "注意：此订单含询价/客制粉料，需人工确认最终金额。" : "注意：固定价格订单，仍需人工确认付款和交货安排。",
      "",
      `[Hermes fallback summary: ${reason}]`,
    ].join("\n"));
  }

  return safeOutput([
    `客制粉料报价/询价草稿：${order.orderNumber}`,
    `客户：${order.customerName}`,
    "",
    itemLines(order),
    "",
    "请店家确认：材料价格、磨粉费、运输费、取货/送货时间、PayNow 付款状态。",
    "AI 未能及时生成，因此先提供这份安全草稿供人工修改。",
    "",
    `[Hermes fallback quote: ${reason}]`,
  ].join("\n"));
}

function aiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  if (provider === "ollama" || provider === "deepseek") {
    return provider;
  }
  throw new Error(`Unsupported AI_PROVIDER: ${provider}. Use "ollama" or "deepseek".`);
}

async function generateWithOllama(kind: AiDraftKind, order: AiOrder) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || process.env.AI_MODEL || "qwen2.5:14b";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: instructionsFor(kind) },
        {
          role: "user",
          content: JSON.stringify({
            task: kindLabels[kind],
            order: minimalOrderContext(order),
          }),
        },
      ],
      options: {
        temperature: 0.3,
        num_ctx: 4096,
        num_predict: kind === "summary" ? 500 : 420,
      },
    }),
  }).catch((error) => {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${AI_TIMEOUT_MS / 1000}s. Try OLLAMA_MODEL=qwen2.5:3b or use AI_PROVIDER=deepseek.`);
    }
    throw error;
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${details.slice(0, 240)}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const text = data.message?.content;
  if (!text) {
    throw new Error("Ollama response did not include message content");
  }

  return safeOutput(text);
}

async function generateWithDeepSeek(kind: AiDraftKind, order: AiOrder) {
  const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY or AI_API_KEY is not configured");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: AI_TIMEOUT_MS,
  });
  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: instructionsFor(kind) },
      {
        role: "user",
        content: JSON.stringify({
          task: kindLabels[kind],
          order: minimalOrderContext(order),
        }),
      },
    ],
    temperature: 0.3,
  });
  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek response did not include message content");
  }

  return safeOutput(text);
}

export async function generateOrderAiDraft(kind: AiDraftKind, order: AiOrder) {
  const provider = aiProvider();
  try {
    if (provider === "deepseek") return generateWithDeepSeek(kind, order);
    return generateWithOllama(kind, order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    if (provider === "ollama" && process.env.AI_FALLBACK_DRAFTS !== "false") {
      return fallbackDraft(kind, order, message);
    }
    throw error;
  }
}
