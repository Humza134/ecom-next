import { z } from "zod";

// Shipping address schema
export const shippingAddressSchema = z.object({
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
  country: z.string().min(1, "Country is required"),
});

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;