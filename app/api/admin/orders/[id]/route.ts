import { requireAdmin } from "@/lib/auth";
import { calculateBalanceCents, calculateDepositCents } from "@/lib/custom-pricing";
import { prisma } from "@/lib/prisma";
import { calculateGstWithRate } from "@/lib/money";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.string().optional(),
  deliveryFeeCents: z.number().int().min(0).nullable().optional(),
  finalTotalCents: z.number().int().min(0).nullable().optional(),
  deliveryNote: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  gstRate: z.union([z.literal(0), z.literal(9)]).optional(),
  depositRequired: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, billToCustomer: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  const current = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deliveryFeeCents =
    parsed.data.deliveryFeeCents === undefined
      ? current.deliveryFeeCents
      : parsed.data.deliveryFeeCents;
  const gstRate = parsed.data.gstRate ?? (current.gstRate as 0 | 9);
  const gstCents = parsed.data.gstRate === undefined ? current.gstCents : calculateGstWithRate(current.subtotalCents, gstRate);
  const finalTotalCents =
    parsed.data.finalTotalCents === undefined
      ? current.finalTotalCents
      : parsed.data.finalTotalCents ??
        (current.hasQuoteItems ? null : current.subtotalCents + gstCents + (deliveryFeeCents ?? 0));

  const depositRequired = parsed.data.depositRequired ?? current.depositRequired;
  const order = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: parsed.data.status,
        gstRate,
        gstCents,
        deliveryFeeCents,
        finalTotalCents,
        deliveryNote: parsed.data.deliveryNote,
        customerId: parsed.data.customerId,
        depositRequired,
      },
    });

    if (parsed.data.depositRequired !== undefined) {
      await Promise.all(
        current.items
          .filter((item) => item.vendorCode && item.lineTotalCents != null)
          .map((item) =>
            tx.orderItem.update({
              where: { id: item.id },
              data: {
                depositCents: depositRequired ? calculateDepositCents(item.lineTotalCents ?? 0) : 0,
                balanceCents: depositRequired ? calculateBalanceCents(item.lineTotalCents ?? 0) : item.lineTotalCents,
              },
            }),
          ),
      );
    }

    return tx.order.findUniqueOrThrow({
      where: { id },
      include: { items: true, billToCustomer: true },
    });
  });

  return NextResponse.json(order);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "cancelled") {
    return NextResponse.json({ error: "Only cancelled orders can be deleted" }, { status: 409 });
  }

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
