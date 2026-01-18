// lib/validators/order-validators.ts
import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.coerce
    .number("Order ID must be a number" ) // convert string to number
    .int("Order ID must be an integer")
    .positive("Order ID must be positive"),
});

// Define the order status enum values directly for Zod
const orderStatusValues = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

// status update schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
});

// Type inference
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
