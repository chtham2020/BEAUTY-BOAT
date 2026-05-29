import { requireAdmin } from "@/lib/auth";
import { parseIngredientLines } from "@/lib/custom-ingredients";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  orderItemId: z.string().min(1),
  vendorCode: z.string().min(2),
  vendorName: z.string().min(1),
});

export async function POST(request: Request) {
  await requireAdmin();
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid template data" }, { status: 400 });

  const vendorCode = parsed.data.vendorCode.trim().toUpperCase();
  const item = await prisma.orderItem.findUnique({ where: { id: parsed.data.orderItemId } });
  if (!item || !item.ingredients) return NextResponse.json({ error: "Custom blend item not found" }, { status: 404 });
  if (item.quoteOnly || item.lineTotalCents == null) {
    return NextResponse.json({ error: "Price ingredients before saving repeat vendor code" }, { status: 409 });
  }

  const ingredientLines = parseIngredientLines(item.ingredients);
  if (ingredientLines.length === 0) {
    return NextResponse.json({ error: "No ingredient rows found" }, { status: 409 });
  }
  const totalWeightJin = ingredientLines.reduce((sum, ingredient) => sum + ingredient.quantityJin, 0);

  const template = await prisma.customBlendTemplate.upsert({
    where: { vendorCode },
    update: {
      vendorName: parsed.data.vendorName.trim(),
      blendType: item.blendType ?? "Repeat customer custom blend",
      unit: item.unit || "斤",
      heatTreatment: item.heatTreatment,
      processSpec: item.processSpec,
      grindingCostPer600gCents: item.grindingCostPer600gCents ?? 0,
      minimumQuantityJin: totalWeightJin,
      totalWeightJin,
      active: true,
      createdFromOrderItemId: item.id,
      ingredients: {
        deleteMany: {},
        create: ingredientLines.map((ingredient, index) => ({
          name: ingredient.name,
          quantityJin: ingredient.quantityJin,
          unitPriceCents: ingredient.unitPriceCents,
          sortOrder: index,
        })),
      },
    },
    create: {
      vendorCode,
      vendorName: parsed.data.vendorName.trim(),
      blendType: item.blendType ?? "Repeat customer custom blend",
      unit: item.unit || "斤",
      heatTreatment: item.heatTreatment,
      processSpec: item.processSpec,
      grindingCostPer600gCents: item.grindingCostPer600gCents ?? 0,
      minimumQuantityJin: totalWeightJin,
      totalWeightJin,
      active: true,
      createdFromOrderItemId: item.id,
      ingredients: {
        create: ingredientLines.map((ingredient, index) => ({
          name: ingredient.name,
          quantityJin: ingredient.quantityJin,
          unitPriceCents: ingredient.unitPriceCents,
          sortOrder: index,
        })),
      },
    },
  });

  return NextResponse.json({ vendorCode: template.vendorCode });
}
