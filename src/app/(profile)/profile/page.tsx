import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { getUser } from "@/services/apiServer";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  return <ProfilePageClient initialUser={user} />;
}
