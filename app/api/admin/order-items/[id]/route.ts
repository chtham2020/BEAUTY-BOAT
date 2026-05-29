import { requireAdmin } from "@/lib/auth";
import { calculateBalanceCents, calculateDepositCents } from "@/lib/custom-pricing";
import {
  calculateIngredientLineTotalCents,
  formatIngredientLines,
  ingredientSubtotalCents,
  ingredientWeightTotalJin,
} from "@/lib/custom-ingredients";
import { calculateGstWithRate } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const ingredientLineSchema = z.object({
  name: z.string().min(1),
  quantityJin: z.number().min(0.01),
  unitPriceCents: z.number().int().min(0),
  lineTotalCents: z.number().int().min(0).optional(),
});

const schema = z.object({
  ingredientLines: z.array(ingredientLineSchema).min(1),
  grindingCostPerJinCents: z.number().int().min(0),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid custom blend item" }, { status: 400 });

  const current = await prisma.orderItem.findUnique({
    where: { id },
    include: {
      order: {
        include: { items: true },
      },
    },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!current.vendorCode && !current.ingredients) {
    return NextResponse.json({ error: "Only custom blend items can be edited here" }, { status: 409 });
  }

  const ingredientLines = parsed.data.ingredientLines.map((line) => ({
    ...line,
    lineTotalCents: line.lineTotalCents ?? calculateIngredientLineTotalCents(line.quantityJin, line.unitPriceCents),
  }));
  const totalWeightJin = ingredientWeightTotalJin(ingredientLines);
  const ingredientsTotalCents = ingredientSubtotalCents(ingredientLines);
  const grindingTotalCents = Math.round(totalWeightJin * parsed.data.grindingCostPerJinCents);
  const lineTotalCents = ingredientsTotalCents + grindingTotalCents;
  const depositCents = current.order.depositRequired ? calculateDepositCents(lineTotalCents) : 0;
  const balanceCents = current.order.depositRequired ? calculateBalanceCents(lineTotalCents) : lineTotalCents;

  const orderItems = current.order.items.map((item) =>
    item.id === current.id
      ? { ...item, lineTotalCents }
      : item,
  );
  const subtotalCents = orderItems.reduce((sum, item) => sum + (item.lineTotalCents ?? 0), 0);
  const gstRate = current.order.gstRate as 0 | 9;
  const gstCents = calculateGstWithRate(subtotalCents, gstRate);
  const hasQuoteItems = orderItems.some((item) => item.id !== current.id && item.quoteOnly);
  const finalTotalCents = hasQuoteItems ? null : subtotalCents + gstCents + (current.order.deliveryFeeCents ?? 0);

  const order = await prisma.order.update({
    where: { id: current.orderId },
    data: {
      subtotalCents,
      gstCents,
      hasQuoteItems,
      finalTotalCents,
      items: {
        update: {
          where: { id: current.id },
          data: {
            quantity: totalWeightJin,
            unit: "斤",
            unitPriceCents: 0,
            lineTotalCents,
            quoteOnly: false,
            ingredients: formatIngredientLines(ingredientLines),
            ingredientQuantity: `${totalWeightJin}斤 total, 1斤 = 600g`,
            grindingCostPer600gCents: parsed.data.grindingCostPerJinCents,
            minimumQuantityKg: totalWeightJin,
            depositCents,
            balanceCents,
          },
        },
      },
    },
    include: { items: true, billToCustomer: true },
  });

  return NextResponse.json(order);
}
