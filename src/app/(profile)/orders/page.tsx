import { OrdersPageClient } from "@/components/profile/OrdersPageClient";
import { getUser } from "@/services/apiServer";

export default async function OrdersPage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  return <OrdersPageClient />;
}
