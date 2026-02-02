import { deleteReview, updateReview } from "@/app/services/review-service";
import { reviewIdParamSchema, updateReviewSchema } from "@/app/validations/reviewZodSchema";
import { ApiResponse } from "@/types/api";
import { ReviewDTO } from "@/types/reviews";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Next.js Route Context Type
type RouteContext = {
    params: Promise<{reviewId: string}>
}

export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, {
                status: 401
            })
        }

        // 2. Parse & Validate ID from URL params
        // Note: In nextjs 15 params can be promise that's why we use await
        const params = await context.params;
        const validationResult = reviewIdParamSchema.safeParse(params);
        if(!validationResult.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Invalid review ID",
                data: null,
                error: { code: "VALIDATION_ERROR", details: validationResult.error.flatten() }
            }, {
                status: 400
            })
        }
        const reviewId = validationResult.data.reviewId;

        // 3. Call Service
        const response = await deleteReview(reviewId, userId);
        // 4. Determine Status Code
        let status = 200;
        if (!response.success) {
            switch (response.error?.code) {
                case "NOT_FOUND": status = 404; break;
                case "FORBIDDEN": status = 403; break; // Permission denied
                case "INTERNAL_ERROR": status = 500; break;
                default: status = 400;
            }
        }

        // 5. Return Response
        return NextResponse.json<ApiResponse<null>>(response, { status });
    } catch (error) {
        console.error("Delete Review Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: RouteContext
) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }

        // 2. Parse & Validate ID
        const params = await context.params;
        const paramValidation = reviewIdParamSchema.safeParse(params);
        
        if (!paramValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Invalid Review ID",
                data: null,
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }
        const reviewId = paramValidation.data.reviewId;

        // 3. Parse & Validate Body
        const body = await req.json();
        const bodyValidation = updateReviewSchema.safeParse(body);

        if (!bodyValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Failed",
                data: null,
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }

        // 4. Call Service
        const response = await updateReview(reviewId, userId, bodyValidation.data);

        // 5. Return Response
        let status = 200;
        if (!response.success) {
            switch (response.error?.code) {
                case "NOT_FOUND": status = 404; break;
                case "FORBIDDEN": status = 403; break;
                case "INTERNAL_ERROR": status = 500; break;
                default: status = 400;
            }
        }

        return NextResponse.json<ApiResponse<ReviewDTO | null>>(response, { status });

    } catch (error) {
        console.error("Update Review Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}