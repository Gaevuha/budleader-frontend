import { Container } from "@/components/layout/Container/Container";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const role = cookieStore.get("role")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  if (role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <Container>
      <h1>Мої замовлення</h1>
      <p>Тут відображатиметься історія ваших замовлень.</p>
    </Container>
  );
}
