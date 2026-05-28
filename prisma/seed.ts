import { PrismaClient } from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { hash, salt };
}

async function main() {
  const products = [
    {
      id: "five-spice-powder",
      nameZh: "五香粉",
      nameEn: "Five-Spice Powder",
      category: "spice-powder",
      description: "传统五香粉，适合卤、炸、腌、焖。",
      unit: "500g",
      priceCents: 1100,
      quoteOnly: false,
      stock: 40,
      active: true,
      image: "/images/carousel-five-spice.png",
    },
    {
      id: "pepper-powder",
      nameZh: "胡椒粉",
      nameEn: "Pepper Powder",
      category: "spice-powder",
      description: "辛香直接，适合汤品、肉类和熟食调味。",
      unit: "500g",
      priceCents: 980,
      quoteOnly: false,
      stock: 35,
      active: true,
      image: "/images/carousel-custom-blends.png",
    },
    {
      id: "custom-blend",
      nameZh: "客制粉料",
      nameEn: "Custom Blend",
      category: "custom-blend",
      description: "按用途、口味和用量调配，适合餐饮与批量使用。",
      unit: "按需求",
      priceCents: null,
      quoteOnly: true,
      stock: 999,
      active: true,
      image: "/images/carousel-spice-shop.png",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  await prisma.customer.upsert({
    where: { id: "yu-xiang-trading" },
    update: {
      nameZh: "昱翔贸易私人有限公司",
      nameEn: "Yu Xiang Trading Pte Ltd",
      addressLine1: "192 Pandan Loop #07-18N",
      addressLine2: "Pantech Business Hub",
      postalCode: "128381",
      phone: "67736331 / 67730091",
      notes: "Imported from existing FOOK ON invoice sample.",
      active: true,
    },
    create: {
      id: "yu-xiang-trading",
      nameZh: "昱翔贸易私人有限公司",
      nameEn: "Yu Xiang Trading Pte Ltd",
      addressLine1: "192 Pandan Loop #07-18N",
      addressLine2: "Pantech Business Hub",
      postalCode: "128381",
      phone: "67736331 / 67730091",
      notes: "Imported from existing FOOK ON invoice sample.",
      active: true,
    },
  });

  const email = process.env.HERMES_ADMIN_EMAIL || "admin@beautyboat.local";
  const password = process.env.HERMES_ADMIN_PASSWORD || "admin12345";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    const { hash, salt } = hashPassword(password);
    await prisma.adminUser.create({
      data: { email, passwordHash: hash, passwordSalt: salt },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
