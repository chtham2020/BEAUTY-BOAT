import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const customerSchema = z.object({
  nameZh: z.string().min(1).optional(),
  nameEn: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const parsed = customerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });

  const customer = await prisma.customer.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(customer);
}
