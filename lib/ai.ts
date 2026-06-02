import OpenAI from "openai";
import { formatMoney } from "./money";

export type AiDraftKind = "whatsapp" | "summary" | "quote";
type AiProvider = "ollama" | "deepseek";

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
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
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
      options: { temperature: 0.3 },
    }),
  });

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
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY or AI_API_KEY is not configured");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
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
  if (provider === "deepseek") return generateWithDeepSeek(kind, order);
  return generateWithOllama(kind, order);
}
