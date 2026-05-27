import OpenAI from "openai";
import { formatMoney } from "./money";

export type AiDraftKind = "whatsapp" | "summary" | "quote";
type AiProvider = "openai" | "deepseek" | "deepseek-anthropic";

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
    gst9Percent: formatMoney(order.gstCents),
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
      ? "Write a concise Chinese WhatsApp follow-up draft for the customer. Mention the order number, confirmation status, GST 9%, delivery fee or pickup arrangement needing shop confirmation, and PayNow UEN 25339900M only after confirmation. Do not include the customer's phone number."
      : kind === "summary"
        ? "Write a concise internal Chinese order summary for the shop owner. Use bullets. Highlight quote items, delivery/payment follow-up, and any customer note."
        : "Write a concise Chinese custom blend quote or supplier inquiry draft for shop staff. Include vendor code/name if present, blend details, quantity, deposit/balance if available, and what still needs manual confirmation.";

  return [
    "You are the Hermes assistant for 福安 / FOOK ON in Singapore. BEAUTY BOAT 美人舟 is the brand; 福安 / FOOK ON is the company.",
    "Brand rules: the brand must be 美人舟 or BEAUTY BOAT only, and the company must be 福安 or FOOK ON. Never write 美人丹, 美人洲, or 源记.",
    "Tone: polite, clear, practical, like a Singapore local provision shop following up with a customer or supplier.",
    "Operational rules: GST is 9%. Delivery fee is quoted separately for Lalamove/Grab. Self pickup timing still needs shop confirmation. PayNow payment is manually verified by the shop. Do not claim payment is confirmed unless the order context says so.",
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
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "openai" || provider === "deepseek" || provider === "deepseek-anthropic") {
    return provider;
  }
  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

async function generateWithOpenAI(kind: AiDraftKind, order: AiOrder) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4.1-mini",
    instructions: instructionsFor(kind),
    input: JSON.stringify({
      task: kindLabels[kind],
      order: minimalOrderContext(order),
    }),
  });

  if (!response.output_text) {
    throw new Error("OpenAI response did not include output_text");
  }

  return safeOutput(response.output_text);
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

async function generateWithDeepSeekAnthropic(kind: AiDraftKind, order: AiOrder) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY or AI_API_KEY is not configured");
  }

  const baseUrl = (process.env.DEEPSEEK_ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic")
    .replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_ANTHROPIC_MODEL || process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || "deepseek-chat",
      max_tokens: 900,
      system: instructionsFor(kind),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            task: kindLabels[kind],
            order: minimalOrderContext(order),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`DeepSeek Anthropic request failed: ${response.status} ${details.slice(0, 240)}`);
  }

  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  const text = data.content?.find((block) => block.type === "text" && block.text)?.text;
  if (!text) {
    throw new Error("DeepSeek Anthropic response did not include text content");
  }

  return safeOutput(text);
}

export async function generateOrderAiDraft(kind: AiDraftKind, order: AiOrder) {
  const provider = aiProvider();
  if (provider === "deepseek-anthropic") return generateWithDeepSeekAnthropic(kind, order);
  if (provider === "deepseek") return generateWithDeepSeek(kind, order);
  return generateWithOpenAI(kind, order);
}
