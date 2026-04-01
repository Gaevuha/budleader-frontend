export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  city: string;
  street: string;
  building: string;
  apartment?: string;
  comment?: string;
}

export type PaymentMethod = "cash" | "card" | "online";
export type DeliveryMethod = "courier" | "pickup" | "post";

export interface CreateOrderPayload {
  items: OrderItemPayload[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  createdAt?: string;
  updatedAt?: string;
}
