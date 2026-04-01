import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";

export default function RegisterPage() {
  return (
    <Container>
      <div style={{ padding: "40px 16px" }}>
        <h1>Реєстрація</h1>
        <p>Сторінка реєстрації буде підключена після інтеграції API.</p>
        <p>
          Вже маєте акаунт? <Link href="/login">Увійти</Link>
        </p>
      </div>
    </Container>
  );
}
