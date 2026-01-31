import { z } from "zod";

export const createReviewSchema = z.object({
    productId: z.coerce
      .number("Product ID must be a number" ) // convert string to number
      .int("Product ID must be an integer") // Ensure the number is an integer
      .positive("Product ID must be positive"), // Ensure the number is positive

    rating: z.number().int().min(1).max(5),
    comment: z.string()
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional(),
})

export const getReviewsQuerySchema = z.object({
    productId: z.coerce
      .number("Product ID must be a number" ) // convert string to number
      .int("Product ID must be an integer") // Ensure the number is an integer
      .positive("Product ID must be positive"), // Ensure the number is positive
})

export const reviewIdParamSchema = z.object({
  reviewId: z.coerce
    .number("review ID must be a number" )
    .int()
    .positive("Review ID must be positive"),
});

// 👇 Update Review Schema
export const updateReviewSchema = z.object({
  rating: z.number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot be more than 5")
    .optional(),
  
  comment: z.string()
    .max(1000, "Comment cannot exceed 1000 characters")
    .optional(),
})
.refine(data => data.rating !== undefined || data.comment !== undefined, {
    message: "At least one field (rating or comment) must be provided for update"
});


export type UpdateReviewSchema = z.infer<typeof updateReviewSchema>;
export type CreateReviewSchema = z.infer<typeof createReviewSchema>;