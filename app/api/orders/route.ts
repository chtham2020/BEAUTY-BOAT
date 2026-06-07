import {
  CUSTOM_BLEND_MINIMUM_JIN,
  CUSTOM_BLEND_PRODUCT_ID,
  calculateBalanceCents,
  calculateCustomLineTotalCents,
  calculateDepositCents,
  getCustomBlendWeightJin,
} from "@/lib/custom-pricing";
import { formatIngredientLines } from "@/lib/custom-ingredients";
import { makeFollowUpText, makeOrderNumber } from "@/lib/hermes";
import { calculateGstWithRate } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { sendTelegramManufacturingOrderAlert, sendTelegramOrderAlert } from "@/lib/telegram";
import { getVendorQuoteFromDb } from "@/lib/vendor-quotes";
import { z } from "zod";
import { NextResponse } from "next/server";

const customRecipeSchema = z.object({
  recipeId: z.string().min(1),
  vendorName: z.string().optional(),
  blendType: z.string().optional(),
  ingredientLines: z
    .array(
      z.object({
        name: z.string().min(1),
        quantityJin: z.number().min(0.01),
      }),
    )
    .min(1),
  ingredients: z.array(z.string()).optional(),
  totalWeightJin: z.number().min(0.01),
  unit: z.string().default("斤"),
  heatTreatment: z.string().optional(),
  processSpec: z.string().optional(),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(6),
  customerNote: z.string().optional(),
  deliveryMethod: z.enum(["third-party", "self-pickup"]),
  deliveryNote: z.string().optional(),
  gstRate: z.union([z.literal(0), z.literal(9)]).default(0),
  depositRequired: z.boolean().default(false),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().min(0.5).max(999),
        customQuote: z
          .object({
            vendorCode: z.string().min(1),
          })
          .optional(),
        customRecipe: customRecipeSchema.optional(),
      }),
    )
    .min(1),
});

function clean(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function saveCustomerSnapshot(order: z.infer<typeof orderSchema>) {
  const customerName = order.customerName.trim();
  const customerPhone = order.customerPhone.trim();
  const deliveryNote = clean(order.deliveryNote);
  const customerNote = clean(order.customerNote);
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone: customerPhone },
        {
          nameZh: customerName,
          addressLine1: deliveryNote,
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    nameZh: customerName,
    phone: customerPhone,
    addressLine1: deliveryNote,
    notes: customerNote,
    active: true,
  };

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.customer.create({ data });
}

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const customRecipeItems = parsed.data.items.filter((item) => item.customRecipe);
  if (customRecipeItems.length > 0) {
    if (parsed.data.items.length > 1) {
      return NextResponse.json({ error: "New Custom Blend recipe must be ordered alone" }, { status: 400 });
    }
    if (customRecipeItems[0].productId !== CUSTOM_BLEND_PRODUCT_ID) {
      return NextResponse.json({ error: "Custom recipe applies only to Custom Blend" }, { status: 400 });
    }
    if (!parsed.data.deliveryNote?.trim()) {
      return NextResponse.json({ error: "Address or pickup/contact details required for new Custom Blend" }, { status: 400 });
    }
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productMap = new Map<string, (typeof products)[number]>();
  for (const product of products) {
    productMap.set(product.id, product);
  }

  try {
    const lines = await Promise.all(
      parsed.data.items.map(async (item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }
        const customQuote =
          product.id === CUSTOM_BLEND_PRODUCT_ID && item.customQuote?.vendorCode
            ? await getVendorQuoteFromDb(item.customQuote.vendorCode)
            : null;
        const customRecipe = product.id === CUSTOM_BLEND_PRODUCT_ID ? item.customRecipe : undefined;

        if (product.id === CUSTOM_BLEND_PRODUCT_ID && !customQuote && !customRecipe) {
          throw new Error("VENDOR_CODE_REQUIRED");
        }
        if (customRecipe) {
          const totalWeightJin = customRecipe.ingredientLines.reduce((sum, ingredient) => sum + ingredient.quantityJin, 0);
          if (totalWeightJin < CUSTOM_BLEND_MINIMUM_JIN) {
            throw new Error("MINIMUM_QUANTITY");
          }
          if (Math.abs(totalWeightJin - customRecipe.totalWeightJin) > 0.001) {
            throw new Error("INVALID_RECIPE_WEIGHT");
          }
        }
        if (customQuote && item.quantity < getCustomBlendWeightJin(customQuote.minimumQuantityJin ?? customQuote.minimumQuantityKg, customQuote)) {
          throw new Error("MINIMUM_QUANTITY");
        }
        if (!product.quoteOnly && product.stock < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }
        return { ...item, product, customQuote, customRecipe };
      }),
    );

    const subtotalCents = lines.reduce((sum, line) => {
      if (line.customQuote) return sum + calculateCustomLineTotalCents(line.quantity, line.customQuote);
      if (line.customRecipe || line.product.quoteOnly || line.product.priceCents == null) return sum;
      return sum + line.product.priceCents * line.quantity;
    }, 0);
    const hasQuoteItems = lines.some(
      (line) => Boolean(line.customRecipe) || (!line.customQuote && (line.product.quoteOnly || line.product.priceCents == null)),
    );
    const depositRequired = customRecipeItems.length > 0;
    const gstCents = calculateGstWithRate(subtotalCents, parsed.data.gstRate);
    const finalTotalCents = hasQuoteItems ? null : subtotalCents + gstCents;
    const orderNumber = makeOrderNumber();
    const deliveryLabel = parsed.data.deliveryMethod === "self-pickup" ? "Self pickup" : "Lalamove / Grab delivery";
    const customer = await saveCustomerSnapshot(parsed.data);
    const followUpText = makeFollowUpText({
      orderNumber,
      customerName: parsed.data.customerName,
      subtotalCents,
      gstCents,
      gstRate: parsed.data.gstRate,
      hasQuoteItems,
      deliveryMethod: deliveryLabel,
      finalTotalCents,
    });

    const order = await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        if (line.customQuote || line.customRecipe || line.product.quoteOnly || line.product.priceCents == null) {
          continue;
        }

        const quantityToDecrement = Math.max(1, Math.ceil(line.quantity));
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: line.product.id,
            stock: { gte: quantityToDecrement },
          },
          data: {
            stock: { decrement: quantityToDecrement },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      return tx.order.create({
      data: {
        orderNumber,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerId: customer.id,
        customerNote: parsed.data.customerNote,
        deliveryMethod: parsed.data.deliveryMethod,
        deliveryNote: parsed.data.deliveryNote,
        subtotalCents,
        gstRate: parsed.data.gstRate,
        gstCents,
        finalTotalCents,
        deliveryFeeCents: parsed.data.deliveryMethod === "self-pickup" ? 0 : null,
        hasQuoteItems,
        depositRequired,
        followUpText,
        items: {
          create: lines.map((line) => {
            const customLineTotal = line.customQuote ? calculateCustomLineTotalCents(line.quantity, line.customQuote) : null;
            return {
              productId: line.product.id,
              productNameZh: line.product.nameZh,
              productNameEn: line.product.nameEn,
              unit: line.customQuote?.unit ?? line.customRecipe?.unit ?? line.product.unit,
              quantity: line.customRecipe?.totalWeightJin ?? line.quantity,
              unitPriceCents: line.customQuote?.unitPriceCents ?? line.product.priceCents,
              lineTotalCents: line.customQuote
                ? customLineTotal
                : line.customRecipe || line.product.quoteOnly || line.product.priceCents == null
                  ? null
                  : line.product.priceCents * line.quantity,
              quoteOnly: line.customRecipe ? true : line.customQuote ? false : line.product.quoteOnly,
              vendorCode: line.customQuote?.vendorCode,
              vendorName: line.customQuote?.vendorName ?? line.customRecipe?.vendorName ?? "New customer recipe",
              blendType: line.customQuote?.blendType ?? line.customRecipe?.blendType ?? "First-time custom blend",
              ingredients: line.customRecipe
                ? formatIngredientLines(
                    line.customRecipe.ingredientLines.map((ingredient) => ({
                      name: ingredient.name,
                      quantityJin: ingredient.quantityJin,
                      unitPriceCents: 0,
                    })),
                  )
                : line.customQuote?.ingredientLines
                  ? formatIngredientLines(
                      line.customQuote.ingredientLines.map((ingredient) => ({
                        name: ingredient.name,
                        quantityJin: ingredient.quantityJin,
                        unitPriceCents: ingredient.unitPriceCents ?? 0,
                      })),
                    )
                  : line.customQuote?.ingredients.join(", "),
              ingredientQuantity: line.customQuote
                ? `${getCustomBlendWeightJin(line.quantity, line.customQuote)}斤 total, 1斤 = 600g`
                : line.customRecipe
                  ? `${line.customRecipe.totalWeightJin}斤 total, 1斤 = 600g`
                  : undefined,
              heatTreatment: line.customQuote?.heatTreatment ?? line.customRecipe?.heatTreatment ?? "Shop to confirm",
              processSpec:
                line.customQuote?.processSpec ??
                ([line.customRecipe?.processSpec, line.customRecipe?.notes].filter(Boolean).join(" | ") || undefined),
              grindingCostPer600gCents: line.customQuote?.grindingCostPer600gCents,
              minimumQuantityKg: line.customQuote
                ? getCustomBlendWeightJin(line.customQuote.minimumQuantityJin ?? line.customQuote.minimumQuantityKg, line.customQuote)
                : line.customRecipe
                  ? line.customRecipe.totalWeightJin
                  : undefined,
              depositCents: line.customQuote && customLineTotal != null
                ? depositRequired
                  ? calculateDepositCents(customLineTotal)
                  : 0
                : undefined,
              balanceCents: line.customQuote && customLineTotal != null
                ? depositRequired
                  ? calculateBalanceCents(customLineTotal)
                  : customLineTotal
                : undefined,
            };
          }),
        },
      },
        include: { items: true },
      });
    });

    sendTelegramOrderAlert(order).catch((telegramError) => {
      console.error("Telegram order alert failed", telegramError);
    });
    sendTelegramManufacturingOrderAlert(order).catch((telegramError) => {
      console.error("Telegram manufacturing order alert failed", telegramError);
    });

    return NextResponse.json({ orderNumber: order.orderNumber });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "VENDOR_CODE_REQUIRED") {
      return NextResponse.json({ error: "Vendor code required for Custom Blend" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "MINIMUM_QUANTITY") {
      return NextResponse.json({ error: "Custom Blend minimum quantity is 10斤 / 6kg" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_RECIPE_WEIGHT") {
      return NextResponse.json({ error: "Custom recipe weight does not match ingredient rows" }, { status: 400 });
    }
    throw error;
  }
}
