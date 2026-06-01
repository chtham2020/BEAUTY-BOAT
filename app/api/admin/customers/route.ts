import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const customerSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

function clean(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function findOrCreateCustomerFromOrder(order: {
  customerName: string;
  customerPhone: string;
  customerNote: string | null;
  deliveryNote: string | null;
}) {
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

async function backfillCustomersFromOrders() {
  const orders = await prisma.order.findMany({
    where: { customerId: null },
    orderBy: { createdAt: "asc" },
  });

  for (const order of orders) {
    const customer = await findOrCreateCustomerFromOrder(order);
    await prisma.order.update({
      where: { id: order.id },
      data: { customerId: customer.id },
    });
  }
}

export async function GET() {
  await requireAdmin();
  await backfillCustomersFromOrders();
  const customers = await prisma.customer.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  await requireAdmin();
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      active: parsed.data.active ?? true,
    },
  });
  return NextResponse.json(customer);
}
