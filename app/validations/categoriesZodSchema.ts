import { z } from "zod";

export const categoriesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});


export const createCategorySchema = z.object({
  name: z.string().min(3, "Category name must be at least 3 characters"),
  description: z.string().optional(),
  // Optional: User can provide slug, otherwise we generate it
  slug: z.string().optional(),
  parentId: z.number().optional().nullable(), // Optional: Parent category ID (if any)
})

export const getCategoryByIdSchema  = z.object({
  categoryId: z.coerce
    .number("category ID must be a number" ) // convert string to number
    .int("category ID must be an integer") // Ensure the number is an integer
    .positive("category ID must be positive"), // Ensure the number is positive
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().optional(),
  parentId: z.number().optional().nullable(),
});

export type CategoriesQuerySchema = z.infer<typeof categoriesQuerySchema>;
export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type GetCategoryByIdSchema = z.infer<typeof getCategoryByIdSchema>;
export type UpdateCategoryBodySchema = z.infer<typeof updateCategoryBodySchema>;
