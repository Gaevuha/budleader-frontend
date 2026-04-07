export type ServiceRequestFieldName =
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "address"
  | "comment"
  | "serviceId"
  | "serviceName"
  | "servicePricePerHour";

export interface ServiceRequestPayload {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  comment: string;
  serviceId: string;
  serviceName: string;
  servicePricePerHour: number;
}

export interface ServiceRequestFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Partial<Record<ServiceRequestFieldName, string>>;
}

export const initialServiceRequestFormState: ServiceRequestFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
