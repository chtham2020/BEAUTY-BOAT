import type { CustomQuoteSnapshot } from "./types";

export const CUSTOM_BLEND_PRODUCT_ID = "custom-blend";
export const CUSTOM_DEPOSIT_RATE = 0.7;

export function customCartKey(productId: string, vendorCode?: string) {
  return vendorCode ? `${productId}:${vendorCode.toUpperCase()}` : productId;
}

export function calculateGrindingCostCents(quantityKg: number, costPer600gCents: number) {
  if (quantityKg <= 0 || costPer600gCents <= 0) return 0;
  return Math.ceil((quantityKg * 1000) / 600) * costPer600gCents;
}

export function calculateCustomLineTotalCents(quantityKg: number, quote: CustomQuoteSnapshot) {
  return quote.unitPriceCents * quantityKg + calculateGrindingCostCents(quantityKg, quote.grindingCostPer600gCents);
}

export function calculateDepositCents(customSubtotalCents: number) {
  return Math.round(customSubtotalCents * CUSTOM_DEPOSIT_RATE);
}

export function calculateBalanceCents(customSubtotalCents: number) {
  return customSubtotalCents - calculateDepositCents(customSubtotalCents);
}
