// app/api/reviews/route.ts
import { createReview, getProductReviews } from "@/app/services/review-service";
import { createReviewSchema, getReviewsQuerySchema } from "@/app/validations/reviewZodSchema";
import { ApiResponse } from "@/types/api";
import { ReviewDTO } from "@/types/reviews";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized. Please login to submit a review.",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }

        // 2. Parse & Validate Body
        const body = await req.json();
        
        // Zod validation safely parse
        const validationResult = createReviewSchema.safeParse(body);

        if (!validationResult.success) {
            // Zod errors ko readable format mein convert karna
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Failed",
                data: null,
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }

        // 3. Call Service
        const { productId, rating, comment } = validationResult.data;
        const response = await createReview(userId, { productId, rating, comment });

        // 4. Determine Status Code based on service response
        let status = 200;
        if (!response.success) {
            switch (response.error?.code) {
                case "NOT_FOUND": status = 404; break;
                case "CONFLICT": status = 409; break; // Duplicate review
                case "INTERNAL_ERROR": status = 500; break;
                default: status = 400;
            }
        } else {
            status = 201; // Created
        }

        return NextResponse.json<ApiResponse<ReviewDTO | null>>(response, { status });

    } catch (error) {
        console.error("Create Review Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // 1. Get Query Parameters (e.g., ?productId=123)
        const { searchParams } = new URL(req.url);
        const queryParams = {
            productId: searchParams.get("productId")
        };
        //2. validation with zod
        const validationResult = getReviewsQuerySchema.safeParse(queryParams);

        if(!validationResult.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Failed",
                data: null,
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }

        // 3. Call Service
        const { productId } = validationResult.data;
        const response = await getProductReviews(productId);

        // 4. Return Response
        let status = 200;
        if (!response.success) {
            status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
        }

        return NextResponse.json<ApiResponse<ReviewDTO[]>>(response, { status });
    } catch (error) {
        console.error("Get Reviews Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}