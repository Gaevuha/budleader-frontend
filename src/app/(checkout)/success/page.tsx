import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";

export default function CheckoutSuccessPage() {
  return (
    <Container style={{ paddingBlock: "48px" }}>
      <h1 style={{ marginBottom: 12 }}>Дякуємо за замовлення</h1>
      <p style={{ marginBottom: 20 }}>
        Ваше замовлення прийнято. Найближчим часом менеджер зв&apos;яжеться з
        вами.
      </p>
      <Link href="/catalog">Повернутися до каталогу</Link>
    </Container>
  );
}
