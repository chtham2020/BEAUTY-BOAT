import Link from "next/link";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shop-page narrow">
      <section className="success-panel">
        <p className="eyebrow">Order Received</p>
        <h1>订单已提交</h1>
        <p>订单编号：<strong>{params.order || "待生成"}</strong></p>
        <p>店家会通过 WhatsApp text 或电话跟进最终报价、运输费、取货/配送安排和 PayNow 付款。</p>
        <Link className="checkout-button" href="/products">
          返回产品
        </Link>
      </section>
    </main>
  );
}
