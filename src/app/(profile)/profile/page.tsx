import { Container } from "@/components/layout/Container/Container";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
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
      <h1>Профіль</h1>
      <p>Тут відображатиметься інформація користувача.</p>
    </Container>
  );
}
