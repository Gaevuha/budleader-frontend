import { create } from "zustand";

type QuickOrderModalState = {
  type: "quickOrder";
  productId: string;
  productName?: string;
};

type ModalState = QuickOrderModalState;

interface ModalStore {
  activeModal: ModalState | null;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
