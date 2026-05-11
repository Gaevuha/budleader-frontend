"use client";

import dynamic from "next/dynamic";

import { useModalStore } from "@/store/ui/modalStore";

const QuickOrderModal = dynamic(
  () =>
    import("@/components/UI/QuickOrderModal/QuickOrderModal").then(
      (module) => module.QuickOrderModal
    ),
  { ssr: false }
);

export function ModalRoot() {
  const activeModal = useModalStore((state) => state.activeModal);
  const closeModal = useModalStore((state) => state.closeModal);

  if (!activeModal) {
    return null;
  }

  if (activeModal.type === "quickOrder") {
    return (
      <QuickOrderModal
        isOpen
        onClose={closeModal}
        productId={activeModal.productId}
        productName={activeModal.productName}
      />
    );
  }

  return null;
}
