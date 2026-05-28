import { calculateGst, formatMoney } from "./money";

export function makeOrderNumber() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  return `BB-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

export function makeFollowUpText(input: {
  orderNumber: string;
  customerName: string;
  subtotalCents: number;
  gstCents: number;
  gstRate: 0 | 9;
  hasQuoteItems: boolean;
  deliveryMethod: string;
  finalTotalCents?: number | null;
}) {
  const totalLabel = input.hasQuoteItems
    ? "最终金额待确认"
    : formatMoney(input.finalTotalCents ?? input.subtotalCents + input.gstCents);

  return [
    `您好 ${input.customerName}，这里是福安，BEAUTY BOAT 美人舟品牌。`,
    `我们已收到订单 ${input.orderNumber}。`,
    `商品小计：${formatMoney(input.subtotalCents)}`,
    `GST ${input.gstRate}%: ${formatMoney(input.gstCents)}`,
    `运输方式：${input.deliveryMethod}`,
    `总额：${totalLabel}`,
    "运输费/取货时间将由店家确认后再通知。",
    "确认后可使用 PayNow UEN 25339900M 付款。谢谢。",
  ].join("\n");
}

export function summarizeFixedTotals(
  items: { quoteOnly: boolean; priceCents: number | null; quantity: number }[],
) {
  const subtotalCents = items.reduce((sum, item) => {
    if (item.quoteOnly || item.priceCents == null) return sum;
    return sum + item.priceCents * item.quantity;
  }, 0);
  return {
    subtotalCents,
    gstCents: calculateGst(subtotalCents),
    hasQuoteItems: items.some((item) => item.quoteOnly || item.priceCents == null),
  };
}
