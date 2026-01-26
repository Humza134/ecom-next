import { z } from "zod";

export const updateUserProfileSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" })
    .regex(/^[a-zA-Z\s]*$/, { message: "Name can only contain letters and spaces" })
    .trim(),
});

// Type inference for usage in Service/Route
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;