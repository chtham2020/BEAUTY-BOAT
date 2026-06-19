export type IngredientUnit = "jin" | "g" | "kg";

export type IngredientPriceLine = {
  name: string;
  quantityJin: number;
  unitPriceCents: number;
  lineTotalCents: number;
  quantity?: number;
  unit?: IngredientUnit;
};

export function quantityToJin(quantity: number, unit: IngredientUnit) {
  if (unit === "kg") return quantity / 0.6;
  if (unit === "g") return quantity / 600;
  return quantity;
}

export function calculateIngredientLineTotalCents(quantityJin: number, unitPriceCents: number) {
  return Math.round(quantityJin * unitPriceCents);
}

export function ingredientWeightTotalJin(lines: { quantityJin: number }[]) {
  return lines.reduce((sum, line) => sum + line.quantityJin, 0);
}

export function ingredientSubtotalCents(lines: { lineTotalCents: number }[]) {
  return lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
}

function normalizeUnit(unit: string | undefined): IngredientUnit {
  const normalized = unit?.trim().toLowerCase();
  if (normalized === "kg" || normalized === "公斤") return "kg";
  if (normalized === "g" || normalized === "gram" || normalized === "grams" || normalized === "克") return "g";
  return "jin";
}

function formatQuantity(quantity: number, unit: IngredientUnit) {
  return unit === "jin" ? `${quantity}斤` : `${quantity}${unit}`;
}

export function displayIngredientQuantity(line: { quantityJin: number; quantity?: number; unit?: IngredientUnit }) {
  return formatQuantity(line.quantity ?? line.quantityJin, line.unit ?? "jin");
}

export function parseIngredientLines(value: string | null | undefined): IngredientPriceLine[] {
  if (!value) return [];

  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const match = part.match(/^(.+?)\s+([\d.]+)\s*(斤|kg|g|公斤|克)?(?:\s+@\s+\$([\d.]+))?(?:\s+=\s+\$([\d.]+))?$/i);
      if (!match) return [];

      const quantity = Number(match[2]);
      const unit = normalizeUnit(match[3]);
      const quantityJin = quantityToJin(quantity, unit);
      const unitPriceCents = match[4] ? Math.round(Number(match[4]) * 100) : 0;
      const lineTotalCents = match[5]
        ? Math.round(Number(match[5]) * 100)
        : calculateIngredientLineTotalCents(quantityJin, unitPriceCents);

      return [{
        name: match[1].trim(),
        quantity,
        unit,
        quantityJin,
        unitPriceCents,
        lineTotalCents,
      }];
    });
}

export function formatIngredientLines(
  lines: {
    name: string;
    quantityJin: number;
    unitPriceCents: number;
    lineTotalCents?: number;
    quantity?: number;
    unit?: IngredientUnit;
  }[],
) {
  return lines
    .map((line) => {
      const lineTotalCents = line.lineTotalCents ?? calculateIngredientLineTotalCents(line.quantityJin, line.unitPriceCents);
      return `${line.name} ${displayIngredientQuantity(line)} @ $${(line.unitPriceCents / 100).toFixed(2)} = $${(lineTotalCents / 100).toFixed(2)}`;
    })
    .join("; ");
}
