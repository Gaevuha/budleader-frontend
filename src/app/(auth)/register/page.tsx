import type { Metadata } from "next";

import { AuthRoutePage } from "@/components/UI/AuthModal/AuthRoutePage";

export const metadata: Metadata = {
  title: "Реєстрація",
  description:
    "Створення акаунта Будлідер для оформлення замовлень, збереження обраного та історії покупок.",
};

export default function RegisterPage() {
  return <AuthRoutePage mode="register" />;
}
