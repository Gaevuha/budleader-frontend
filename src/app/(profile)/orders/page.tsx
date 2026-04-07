import { OrdersPageClient } from "@/components/profile/OrdersPageClient";
import { getUser } from "@/services/apiServer";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  return <OrdersPageClient />;
}
