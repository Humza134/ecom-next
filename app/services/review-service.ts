import { db } from "@/lib/db";
import { products, reviews, users } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { CreateReviewInput, ReviewDTO, UpdateReviewInput } from "@/types/reviews";
import { and, eq, desc } from "drizzle-orm";

export async function createReview(
    userId: string, 
    data: CreateReviewInput
):Promise<ApiResponse<ReviewDTO>> {
    try {
        //1. check product is exist
        const productExists = await db.query.products.findFirst({
            where: eq(products.id, data.productId),
            columns: {id: true}
        });
        if(!productExists) {
            return {
                success: false,
                message: "Product not found",
                data: null,
                error: {code: "NOT_FOUND"}
            }
        }

        // 2. Check for Duplicate Review
        // Best Practice: User should only review a product once. (optional but recommended)
        const existingReview = await db.query.reviews.findFirst({
            where: and(
                eq(reviews.userId, userId),
                eq(reviews.productId, data.productId)
            )
        });

        if(existingReview) {
            return {
                success: false,
                message: "You have already reviewed this product",
                data: null,
                error: {code: "CONFLICT"} // 409 Conflict
            }
        }

        // 3. Insert Review
        // use drizzle returning to return the inserted data
        const [newReview] = await db.insert(reviews).values({
            userId: userId,
            productId: data.productId,
            rating: data.rating,
            comment: data.comment,
        }).returning();

        // 4. Transform to DTO
        const formattedReview: ReviewDTO = {
            id: newReview.id,
            rating: newReview.rating,
            comment: newReview.comment,
            createdAt: newReview.createdAt
        }
        return {
            success: true,
            message: "Review created successfully",
            data: formattedReview
        }
    } catch (error) {
        console.error("createReview Service Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: {code: "INTERNAL_ERROR"}
        }
    }
}

export async function getProductReviews(productId: number): Promise<ApiResponse<ReviewDTO[]>> {
    try {
        // 1. Fetch Reviews with User Details
        const reviewsData = await db.query.reviews.findMany({
            where: eq(reviews.productId, productId),
            // Latest reviews first
            orderBy: [desc(reviews.createdAt)],
            // Production tip: It is good practice to set a limit so that the database does not crash if there are 1000 reviews.
            limit: 50,
            with: {
                user: {
                    columns: {
                        id: true,
                        fullName: true,
                    }
                }
            } 
        });

        if(!reviewsData) {
            return {
                success: false,
                message: "Reviews not found",
                data: null,
                error: {code: "NOT_FOUND"}
            }
        }

        // 2. Transform to DTO
        const formattedReviews: ReviewDTO[] = reviewsData.map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            user: {
                id: review.user.id,
                fullName: review.user.fullName
            }
        }));
        return {
            success: true,
            message: "Reviews fetched successfully",
            data: formattedReviews
        }
    } catch (error) {
        console.error("getProductReviews Service Error:", error);
        return {
            success: false,
            message: "Failed to fetch reviews",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}

export async function deleteReview(reviewId: number, currentUserId: string): Promise<ApiResponse<null>> {
    try {
        // 1. check review is exist or not
        const reviewExists = await db.query.reviews.findFirst({
            where: eq(reviews.id, reviewId),
            columns: {id: true, userId: true}
        });
        if(!reviewExists) {
            return {
                success: false,
                message: "Review not found",
                data: null,
                error: {code: "NOT_FOUND"}
            }
        }

        //2. Authorization Step
        let isAuthorized = false;
        // Case A: User delete its own review
        if(reviewExists.userId === currentUserId) {
            isAuthorized = true;
        } else {
            // Case B: if user is not owner then check is it Admin
            const requester = await db.query.users.findFirst({
                where: eq(users.id, currentUserId),
                columns: {role: true}
            });
            if(requester && requester.role === "admin") {
                isAuthorized = true;
            }
        }
        // if is it not authorized
        if(!isAuthorized) {
            return {
                success: false,
                message: "You are not authorized to delete this review",
                data: null,
                error: {code: "FORBIDDEN"}
            }
        }

        //3. Delete Review
        await db.delete(reviews).where(eq(reviews.id, reviewId));
        return {
            success: true,
            message: "Review deleted successfully",
            data: null
        }
    } catch (error) {
        console.error("deleteReview Service Error:", error);
        return {
            success: false,
            message: "Failed to delete review",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}

export async function updateReview(
    reviewId: number, 
    userId: string, 
    input: UpdateReviewInput
): Promise<ApiResponse<ReviewDTO>> {
    try {
        // 1. check review is exist or not
        const existingReview = await db.query.reviews.findFirst({
            where: eq(reviews.id, reviewId),
            columns: {
                id: true,
                userId: true, // Required for Authorization
            }
        });

        if (!existingReview) {
            return {
                success: false,
                message: "Review not found",
                data: null,
                error: { code: "NOT_FOUND" }
            };
        }

        // 2. Authorization Check (Strict: Only Owner) 🔒
        if (existingReview.userId !== userId) {
            return {
                success: false,
                message: "You can only edit your own reviews",
                data: null,
                error: { code: "FORBIDDEN" } // 403 Forbidden
            };
        }

        // 3. Update Operation
        // We are also setting 'updatedAt' manually so that it is known that it has been edited. 
        const [updatedReview] = await db.update(reviews)
            .set({
                ...input,
                updatedAt: new Date(), 
            })
            .where(eq(reviews.id, reviewId))
            .returning();

        // 4. Transform to DTO
        const reviewDTO: ReviewDTO = {
            id: updatedReview.id,
            rating: updatedReview.rating,
            comment: updatedReview.comment,
            createdAt: updatedReview.createdAt, // Original creation time
            // If you want to show the updated front-end, put the updatedAt in DTO
        };

        return {
            success: true,
            message: "Review updated successfully",
            data: reviewDTO
        };

    } catch (error) {
        console.error("updateReview Service Error:", error);
        return {
            success: false,
            message: "Failed to update review",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}