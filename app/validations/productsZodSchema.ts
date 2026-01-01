import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  category: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
});

// --- 1. Schema for Creating/Updating a Product ---
export const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  
  // Handle price as string or number, convert to string for DB
  price: z.union([z.string(), z.number()]).refine((val) => !isNaN(Number(val)), {
    message: "Price must be a valid number",
  }),
  
  stock: z.coerce.number().min(0).default(0),
  categoryId: z.number().int().positive("Category ID must be a positive number"),
  
  // Optional: User can provide slug, otherwise we generate it
  slug: z.string().optional(),
  
  images: z.array(
    z.object({
      url: z.string().url("Invalid image URL"),
      altText: z.string().optional(),
      isPrimary: z.boolean().default(false),
    })
  ).min(1, "At least one image is required"),
});

export const productUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]).refine((val) => !isNaN(Number(val)), {
    message: "Price must be a valid number",
  }).optional(),
  stock: z.coerce.number().min(0).optional(),
  categoryId: z.number().int().optional(),
  isActive: z.boolean().optional(),
  images: z.array(
    z.object({
      id: z.number().optional(), 
      url: z.string().url(),
      altText: z.string().optional().nullable(),
      isPrimary: z.boolean().default(false),
    })
  ).optional(),
});

export const paramsProductIdSchema = z.object({
  productId: z.coerce
    .number("Product ID must be a number" ) // convert string to number
    .int("Product ID must be an integer") // Ensure the number is an integer
    .positive("Product ID must be positive"), // Ensure the number is positive
});

export type ParamsProductIdSchema = z.infer<typeof paramsProductIdSchema>;
export type QuerySchema = z.infer<typeof querySchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;