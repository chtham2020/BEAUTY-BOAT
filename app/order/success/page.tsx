import { OrderSuccessClient } from "./OrderSuccessClient";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shop-page narrow">
      <OrderSuccessClient order={params.order} />
    </main>
  );
}
