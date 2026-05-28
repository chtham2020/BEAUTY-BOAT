import { requireAdmin } from "@/lib/auth";
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

  const current = await prisma.order.findUnique({ where: { id } });
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

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      gstRate,
      gstCents,
      deliveryFeeCents,
      finalTotalCents,
      deliveryNote: parsed.data.deliveryNote,
      customerId: parsed.data.customerId,
      depositRequired: parsed.data.depositRequired,
    },
    include: { items: true, billToCustomer: true },
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
