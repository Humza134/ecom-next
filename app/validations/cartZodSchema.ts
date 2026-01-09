import { z } from "zod";

export const addToCartSchema = z.object({
    productId: z.number("Product ID is required").int().positive(),
    quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
})

export const updateCartItemBodySchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});


export const cartItemIdSchema   = z.object({
  itemId: z.coerce
    .number("cart ID must be a number" ) // convert string to number
    .int("cart ID must be an integer") // Ensure the number is an integer
    .positive("cart ID must be positive"), // Ensure the number is positive
});


export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemBodySchema = z.infer<typeof updateCartItemBodySchema>;