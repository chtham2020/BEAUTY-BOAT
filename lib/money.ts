export const GST_RATE = 0.09;

export function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "待确认";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(cents / 100);
}

export function calculateGst(subtotalCents: number) {
  return Math.round(subtotalCents * GST_RATE);
}
