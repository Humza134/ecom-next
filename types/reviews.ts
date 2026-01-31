import { type Review, type User, type Product } from "@/lib/db/schema/schemas";

// ✨ Review Create Input
export interface CreateReviewInput {
    productId: number;
    rating: number;
    comment?: string;
}

// ✨ Review DTO (those who send in response)

export interface ReviewDTO extends Pick<Review, "id" | "rating" | "comment" | "createdAt"> {
    user?: Pick<User, "id" | "fullName">; // Optional: User who wrote the review
    product?: Pick<Product, "id" | "title" | "slug">;
}

// ✨ Review Update Input
export interface UpdateReviewInput {
    rating?: number;
    comment?: string;
}