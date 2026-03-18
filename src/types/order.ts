export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
}

export interface CreateOrderPayload {
  items: OrderItemPayload[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  deliveryMethod: string;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  createdAt?: string;
  updatedAt?: string;
}
