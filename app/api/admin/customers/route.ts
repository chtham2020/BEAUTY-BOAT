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

export async function GET() {
  await requireAdmin();
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
