import type { Metadata } from "next";

import { AuthRoutePage } from "@/components/UI/AuthModal/AuthRoutePage";

export const metadata: Metadata = {
  title: "Вхід",
  description:
    "Вхід до акаунта Будлідер для оформлення замовлень і керування профілем.",
};

export default function LoginPage() {
  return <AuthRoutePage mode="login" />;
}
