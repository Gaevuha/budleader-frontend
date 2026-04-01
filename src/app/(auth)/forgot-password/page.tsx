import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";

export default function ForgotPasswordPage() {
  return (
    <Container>
      <div style={{ padding: "40px 16px" }}>
        <h1>Відновлення пароля</h1>
        <p>Функціонал відновлення пароля буде доступний найближчим часом.</p>
        <p>
          Повернутися до <Link href="/login">входу</Link>
        </p>
      </div>
    </Container>
  );
}
