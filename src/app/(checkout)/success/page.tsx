import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";

export const metadata: Metadata = {
  title: "Замовлення прийнято",
  description: "Підтвердження успішного оформлення замовлення в Будлідер.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutSuccessPage() {
  return (
    <section>
      <Container style={{ paddingBlock: "48px" }}>
        <h1 style={{ marginBottom: 12 }}>Дякуємо за замовлення</h1>
        <p style={{ marginBottom: 20 }}>
          Ваше замовлення прийнято. Найближчим часом менеджер зв&apos;яжеться з
          вами.
        </p>
        <Link href="/catalog">Повернутися до каталогу</Link>
      </Container>
    </section>
  );
}
