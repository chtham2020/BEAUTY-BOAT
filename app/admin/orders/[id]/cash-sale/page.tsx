import { getAdminSession } from "@/lib/auth";
import { ingredientSubtotalCents, ingredientWeightTotalJin, parseIngredientLines } from "@/lib/custom-ingredients";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "./PrintButton";

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function billToLines(order: NonNullable<Awaited<ReturnType<typeof getOrder>>>) {
  const customer = order.billToCustomer;
  if (customer) {
    return [
      customer.nameZh,
      customer.nameEn,
      customer.addressLine1,
      customer.addressLine2,
      customer.postalCode ? `Singapore ${customer.postalCode}` : null,
      customer.phone ? `Tel ${customer.phone}` : null,
    ].filter(Boolean);
  }

  return [
    order.customerName,
    order.customerPhone ? `Tel ${order.customerPhone}` : null,
    order.customerNote,
  ].filter(Boolean);
}

async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      billToCustomer: true,
      items: true,
    },
  });
}

function renderInvoiceItemRows(item: NonNullable<Awaited<ReturnType<typeof getOrder>>>["items"][number]) {
  const ingredientLines = parseIngredientLines(item.ingredients);
  if (ingredientLines.length > 0) {
    const totalWeightJin = ingredientWeightTotalJin(ingredientLines);
    const ingredientsSubtotal = ingredientSubtotalCents(ingredientLines);
    const grindingTotal = Math.max(0, (item.lineTotalCents ?? 0) - ingredientsSubtotal);

    return (
      <>
        {ingredientLines.map((ingredient, index) => (
          <tr key={`${item.id}-${ingredient.name}-${index}`}>
            <td>{ingredient.quantityJin}</td>
            <td>{ingredient.name}</td>
            <td>{formatMoney(ingredient.unitPriceCents)}</td>
            <td>斤</td>
            <td />
            <td>{formatMoney(ingredient.lineTotalCents)}</td>
          </tr>
        ))}
        <tr key={`${item.id}-grinding`}>
          <td>{totalWeightJin}</td>
          <td>磨工 / Grinding</td>
          <td>{formatMoney(item.grindingCostPer600gCents)}</td>
          <td>斤</td>
          <td />
          <td>{formatMoney(grindingTotal)}</td>
        </tr>
      </>
    );
  }

  return (
    <tr key={item.id}>
      <td>{item.quantity}</td>
      <td>
        <strong>{item.productNameZh}</strong>
        <span>{item.productNameEn}</span>
        {item.blendType && <span>{item.blendType}</span>}
      </td>
      <td>{item.unitPriceCents == null ? "待确认" : formatMoney(item.unitPriceCents)}</td>
      <td>斤</td>
      <td />
      <td>{item.lineTotalCents == null ? "待确认" : formatMoney(item.lineTotalCents)}</td>
    </tr>
  );
}

export default async function CashSalePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const lines = billToLines(order);
  const deliveryFee = order.deliveryFeeCents ?? 0;
  const computedTotal = order.subtotalCents + order.gstCents + deliveryFee;
  const total = order.finalTotalCents ?? computedTotal;

  return (
    <main className="invoice-page">
      <div className="invoice-toolbar">
        <Link className="invoice-nav-button" href={`/admin/orders/${order.id}`}>
          Back to Order
        </Link>
        <Link className="invoice-nav-button" href="/admin/orders">
          Orders Home
        </Link>
        <PrintButton />
      </div>

      <article className="invoice-sheet">
        <header className="invoice-company">
          <div className="invoice-logo-wrap">
            <Image src="/images/logo-fo.png" alt="FOOK ON 福安" width={90} height={90} priority />
          </div>
          <div>
            <h1>福安</h1>
            <h2>Fook On</h2>
            <p>UEN 25339900M (PayNow)</p>
            <p>BLK 551 BEDOK NORTH AVE 1</p>
            <p>#01-546, SINGAPORE 460551</p>
            <p>Tel: 6441 6390</p>
          </div>
          <div className="invoice-title-block">
            <strong>沽单</strong>
            <span>Cash Sale</span>
            <p>INVOICE No: {order.orderNumber}</p>
            <p>Date: {displayDate(order.createdAt)}</p>
          </div>
        </header>

        <section className="invoice-billto">
          <div>
            <strong>Bill To :</strong>
            {lines.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
          <div>
            <strong>Delivery :</strong>
            <p>{order.deliveryMethod === "self-pickup" ? "Self pickup / 自费领取" : "Lalamove / Grab 配送"}</p>
            {order.deliveryNote && <p>{order.deliveryNote}</p>}
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>数量<br />Quantity</th>
              <th>货品<br />Description of goods</th>
              <th>单价<br />Unit price</th>
              <th>净重<br />Nett Wt</th>
              <th>价升<br />Next price</th>
              <th>金额<br />Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => renderInvoiceItemRows(item))}
            {false && order?.items.map((item) => (
              <tr key={item.id}>
                <td>{item.quantity}</td>
                <td>
                  <strong>{item.productNameZh}</strong>
                  <span>{item.productNameEn}</span>
                  {item.blendType && <span>{item.blendType}</span>}
                  {item.ingredients && <span>{item.ingredients}</span>}
                </td>
                <td>{item.unitPriceCents == null ? "待确认" : formatMoney(item.unitPriceCents)}</td>
                <td>斤</td>
                <td />
                <td>{item.lineTotalCents == null ? "待确认" : formatMoney(item.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>商品小计 / Subtotal</td>
              <td>{formatMoney(order.subtotalCents)}</td>
            </tr>
            <tr>
              <td colSpan={5}>GST {order.gstRate ?? 0}%</td>
              <td>{formatMoney(order.gstCents)}</td>
            </tr>
            <tr>
              <td colSpan={5}>运输费 / Delivery</td>
              <td>{order.deliveryFeeCents == null ? "另计" : formatMoney(order.deliveryFeeCents)}</td>
            </tr>
            <tr className="invoice-total-row">
              <td colSpan={5}>共计欠 / Total</td>
              <td>{order.hasQuoteItems && order.finalTotalCents == null ? "待确认" : formatMoney(total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="invoice-note">注：净重单位「斤」按 1 斤 = 600g 记录。Quote-only items and delivery fees are confirmed manually by FOOK ON.</p>

        <footer className="invoice-footer">
          <div>
            <p>Received the above mention goods</p>
            <span>customer chop / signature</span>
          </div>
          <div>
            <p>FOOK ON / 福安</p>
            <span>Issued by Hermes</span>
          </div>
        </footer>
      </article>
    </main>
  );
}
