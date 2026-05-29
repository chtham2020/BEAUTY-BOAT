import type { CustomQuoteSnapshot } from "./types";

function withTotalWeight(quote: CustomQuoteSnapshot): CustomQuoteSnapshot {
  const totalWeightJin =
    quote.totalWeightJin ??
    quote.ingredientLines?.reduce((sum, ingredient) => sum + ingredient.quantityJin, 0) ??
    quote.minimumQuantityJin ??
    quote.minimumQuantityKg;

  return {
    ...quote,
    totalWeightJin,
    minimumQuantityJin: quote.minimumQuantityJin ?? totalWeightJin,
    minimumQuantityKg: quote.minimumQuantityKg || totalWeightJin,
    ingredientQuantity: quote.ingredientQuantity || `${totalWeightJin}斤 total blend`,
  };
}

const vendorQuotes: Record<string, CustomQuoteSnapshot> = {
  "YJ-21": withTotalWeight({
    vendorCode: "YJ-21",
    vendorName: "YJ Repeat Customer",
    blendType: "Repeat customer custom blend",
    ingredients: ["八角", "桂皮", "沙姜", "花椒", "丁香", "小茴", "甘草", "归头"],
    ingredientLines: [
      { name: "八角", quantityJin: 2, unitPriceCents: 1000, lineTotalCents: 2000 },
      { name: "桂皮", quantityJin: 3, unitPriceCents: 720, lineTotalCents: 2160 },
      { name: "沙姜", quantityJin: 3, unitPriceCents: 1500, lineTotalCents: 4500 },
      { name: "花椒", quantityJin: 3, unitPriceCents: 1150, lineTotalCents: 3450 },
      { name: "丁香", quantityJin: 1, unitPriceCents: 1100, lineTotalCents: 1100 },
      { name: "小茴", quantityJin: 2, unitPriceCents: 240, lineTotalCents: 480 },
      { name: "甘草", quantityJin: 3, unitPriceCents: 1000, lineTotalCents: 3000 },
      { name: "归头", quantityJin: 4, unitPriceCents: 5000, lineTotalCents: 20000 },
    ],
    ingredientQuantity: "21斤 total blend, 1斤 = 600g",
    unit: "斤",
    heatTreatment: "Repeat customer supplied blend; confirm any baking/heat treatment before grinding",
    processSpec: "Fine grinding charge applies on total finished mixture weight",
    grindingCostPer600gCents: 350,
    grindingCostPerJinCents: 350,
    minimumQuantityKg: 21,
    minimumQuantityJin: 21,
    totalWeightJin: 21,
    unitPriceCents: 0,
  }),
  "WSS-20.5": withTotalWeight({
    vendorCode: "WSS-20.5",
    vendorName: "王祥顺",
    blendType: "Customer supplied ingredient blend",
    ingredients: ["八角", "桂皮", "芫荽子", "川芎", "胡椒子", "甘皮", "丁香", "小茴", "归头", "甘草"],
    ingredientLines: [
      { name: "八角", quantityJin: 5, unitPriceCents: 1000, lineTotalCents: 5000 },
      { name: "桂皮", quantityJin: 4, unitPriceCents: 720, lineTotalCents: 2880 },
      { name: "芫荽子", quantityJin: 2, unitPriceCents: 200, lineTotalCents: 400 },
      { name: "川芎", quantityJin: 1, unitPriceCents: 1350, lineTotalCents: 1350 },
      { name: "胡椒子", quantityJin: 2.5, unitPriceCents: 1500, lineTotalCents: 3750 },
      { name: "甘皮", quantityJin: 2, unitPriceCents: 420, lineTotalCents: 840 },
      { name: "丁香", quantityJin: 1, unitPriceCents: 1200, lineTotalCents: 1200 },
      { name: "小茴", quantityJin: 1, unitPriceCents: 220, lineTotalCents: 220 },
      { name: "归头", quantityJin: 1, unitPriceCents: 5200, lineTotalCents: 5200 },
      { name: "甘草", quantityJin: 1, unitPriceCents: 910, lineTotalCents: 910 },
    ],
    ingredientQuantity: "20.5斤 total blend, 1斤 = 600g",
    unit: "斤",
    heatTreatment: "Customer supplied ingredients; shop confirms any baking/heat treatment before grinding",
    processSpec: "Fine grinding charge applies on total finished mixture weight",
    grindingCostPer600gCents: 300,
    grindingCostPerJinCents: 300,
    minimumQuantityKg: 20.5,
    minimumQuantityJin: 20.5,
    totalWeightJin: 20.5,
    unitPriceCents: 0,
  }),
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
  const quote = vendorQuotes[vendorCode.trim().toUpperCase()] ?? null;
  return quote ? withTotalWeight(quote) : null;
}
