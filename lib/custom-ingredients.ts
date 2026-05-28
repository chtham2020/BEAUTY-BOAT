export type IngredientPriceLine = {
  name: string;
  quantityJin: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export function calculateIngredientLineTotalCents(quantityJin: number, unitPriceCents: number) {
  return Math.round(quantityJin * unitPriceCents);
}

export function ingredientWeightTotalJin(lines: { quantityJin: number }[]) {
  return lines.reduce((sum, line) => sum + line.quantityJin, 0);
}

export function ingredientSubtotalCents(lines: { lineTotalCents: number }[]) {
  return lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
}

export function parseIngredientLines(value: string | null | undefined): IngredientPriceLine[] {
  if (!value) return [];

  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s+([\d.]+)(?:斤|æ–¤)?(?:\s+@\s+\$([\d.]+))?(?:\s+=\s+\$([\d.]+))?$/);
      if (!match) return null;

      const quantityJin = Number(match[2]);
      const unitPriceCents = match[3] ? Math.round(Number(match[3]) * 100) : 0;
      const lineTotalCents = match[4]
        ? Math.round(Number(match[4]) * 100)
        : calculateIngredientLineTotalCents(quantityJin, unitPriceCents);

      return {
        name: match[1].trim(),
        quantityJin,
        unitPriceCents,
        lineTotalCents,
      };
    })
    .filter((line): line is IngredientPriceLine => line != null);
}

export function formatIngredientLines(lines: { name: string; quantityJin: number; unitPriceCents: number }[]) {
  return lines
    .map((line) => {
      const lineTotalCents = calculateIngredientLineTotalCents(line.quantityJin, line.unitPriceCents);
      return `${line.name} ${line.quantityJin}斤 @ $${(line.unitPriceCents / 100).toFixed(2)} = $${(lineTotalCents / 100).toFixed(2)}`;
    })
    .join("; ");
}
