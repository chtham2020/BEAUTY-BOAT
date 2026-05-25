import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGst } from "@/lib/money";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.string().optional(),
  deliveryFeeCents: z.number().int().min(0).nullable().optional(),
  finalTotalCents: z.number().int().min(0).nullable().optional(),
  deliveryNote: z.string().nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
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
  const finalTotalCents =
    parsed.data.finalTotalCents === undefined
      ? current.finalTotalCents
      : parsed.data.finalTotalCents ??
        (current.hasQuoteItems ? null : current.subtotalCents + calculateGst(current.subtotalCents) + (deliveryFeeCents ?? 0));

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      deliveryFeeCents,
      finalTotalCents,
      deliveryNote: parsed.data.deliveryNote,
    },
    include: { items: true },
  });

  return NextResponse.json(order);
}
