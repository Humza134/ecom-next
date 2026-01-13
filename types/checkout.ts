export interface CheckoutResponseDTO {
  clientSecret: string | null; // stripe client secret for frontend
  orderId: number;
  totalAmount: string;
}