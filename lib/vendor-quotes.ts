import type { CustomQuoteSnapshot } from "./types";

const vendorQuotes: Record<string, CustomQuoteSnapshot> = {
  "BB600-A": {
    vendorCode: "BB600-A",
    vendorName: "FOOK ON Sample Vendor A",
    blendType: "Heat-treated curry spice blend",
    ingredients: ["Coriander", "Cumin", "Fennel", "White pepper", "Star anise"],
    ingredientQuantity: "6kg finished blend, packed after treatment",
    unit: "kg",
    heatTreatment: "Bake at low heat before final blending",
    processSpec: "Fine grind, sieve checked, grinding cost applies per 600g block",
    grindingCostPer600gCents: 180,
    minimumQuantityKg: 6,
    unitPriceCents: 1280,
  },
  "BB600-B": {
    vendorCode: "BB600-B",
    vendorName: "FOOK ON Sample Vendor B",
    blendType: "Roasted pepper seasoning blend",
    ingredients: ["Black pepper", "White pepper", "Garlic powder", "Five-spice base"],
    ingredientQuantity: "8kg finished blend, food-service batch",
    unit: "kg",
    heatTreatment: "Roast and cool before grinding",
    processSpec: "Medium-fine grind for cooked food and soup applications",
    grindingCostPer600gCents: 220,
    minimumQuantityKg: 8,
    unitPriceCents: 1460,
  },
};

export function getVendorQuote(vendorCode: string) {
  return vendorQuotes[vendorCode.trim().toUpperCase()] ?? null;
}
