import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { getUser } from "@/services/apiServer";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  return <ProfilePageClient initialUser={user} />;
}
