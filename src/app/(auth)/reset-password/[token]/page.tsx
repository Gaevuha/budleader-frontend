import { ResetPasswordClient } from "./ResetPasswordClient";

interface ResetPasswordPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const resolvedParams = await params;

  return <ResetPasswordClient token={resolvedParams.token} />;
}
