import type { Metadata } from "next";

import { AuthRoutePage } from "@/components/UI/AuthModal/AuthRoutePage";

export const metadata: Metadata = {
  title: "Відновлення пароля",
  description: "Запит на відновлення доступу до акаунта Будлідер.",
};

export default function ForgotPasswordPage() {
  return <AuthRoutePage mode="forgot" />;
}
