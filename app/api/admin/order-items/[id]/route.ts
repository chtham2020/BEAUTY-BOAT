import { requireAdmin } from "@/lib/auth";
import { calculateBalanceCents, calculateDepositCents } from "@/lib/custom-pricing";
import { formatIngredientLines, ingredientSubtotalCents, ingredientWeightTotalJin } from "@/lib/custom-ingredients";
import { makeFollowUpText } from "@/lib/hermes";
import { calculateGstWithRate } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const ingredientLineSchema = z.object({
  name: z.string().min(1),
  quantityJin: z.number().min(0.01),
  quantity: z.number().min(0.01).optional(),
  unit: z.enum(["jin", "g", "kg"]).optional(),
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

  const isNoGrinding = current.heatTreatment === "Not to grind";
  const ingredientLines = parsed.data.ingredientLines.map((line) => {
    const pricingQuantity = isNoGrinding ? line.quantityJin * 0.6 : line.quantityJin;
    return {
      ...line,
      lineTotalCents: line.lineTotalCents ?? Math.round(pricingQuantity * line.unitPriceCents),
    };
  });
  const totalWeightJin = ingredientWeightTotalJin(ingredientLines);
  const ingredientsTotalCents = ingredientSubtotalCents(ingredientLines);
  const grindingCostPerJinCents = isNoGrinding ? 0 : parsed.data.grindingCostPerJinCents;
  const grindingTotalCents = Math.round(totalWeightJin * grindingCostPerJinCents);
  const lineTotalCents = ingredientsTotalCents + grindingTotalCents;
  const depositCents = !isNoGrinding && current.order.depositRequired ? calculateDepositCents(lineTotalCents) : 0;
  const balanceCents = !isNoGrinding && current.order.depositRequired ? calculateBalanceCents(lineTotalCents) : lineTotalCents;

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
  const deliveryLabel = current.order.deliveryMethod === "self-pickup" ? "Self pickup" : "Lalamove / Grab delivery";
  const followUpText = makeFollowUpText({
    orderNumber: current.order.orderNumber,
    customerName: current.order.customerName,
    subtotalCents,
    gstCents,
    gstRate,
    hasQuoteItems,
    deliveryMethod: deliveryLabel,
    finalTotalCents,
  });

  const order = await prisma.order.update({
    where: { id: current.orderId },
    data: {
      subtotalCents,
      gstCents,
      hasQuoteItems,
      finalTotalCents,
      followUpText,
      items: {
        update: {
          where: { id: current.id },
          data: {
            quantity: totalWeightJin,
            unit: isNoGrinding ? "recipe" : "斤",
            unitPriceCents: 0,
            lineTotalCents,
            quoteOnly: false,
            ingredients: formatIngredientLines(ingredientLines),
            ingredientQuantity: isNoGrinding ? current.ingredientQuantity : `${totalWeightJin}斤 total, 1斤 = 600g`,
            grindingCostPer600gCents: grindingCostPerJinCents,
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
