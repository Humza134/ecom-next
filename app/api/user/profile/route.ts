import { getUserProfile, updateUserProfile } from "@/app/services/user-service";
import { updateUserProfileSchema } from "@/app/validations/userZodSchema";
import { ApiResponse } from "@/types/api";
import { UserProfileDTO } from "@/types/profile";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if(!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, {status: 401});
        }
        // call service
        const response = await getUserProfile(userId);
        let status = 200;
        if (!response.success) {
            // Determine status code based on error type
            if (response.error?.code === "NOT_FOUND") status = 404;
            else if (response.error?.code === "INTERNAL_ERROR") status = 500;
            else status = 400;
        }
        return NextResponse.json<ApiResponse<UserProfileDTO>>(response, { status });
    } catch (error) {
        console.error("User Profile Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
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

        // 2. Parse & Validate Request Body
        const body = await req.json();
        
        // Zod validation (Safe Parse allows handling errors gracefully)
        const validationResult = updateUserProfileSchema.safeParse(body);

        if (!validationResult.success) {
            // Extract validation errors nicely
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR", details: validationResult.error.flatten() }
            }, { status: 400 });
        }

        // 3. Call Service
        const response = await updateUserProfile(userId, validationResult.data);

        let status = 200;
        if (!response.success) {
            if (response.error?.code === "NOT_FOUND") status = 404;
            if(response.error?.code === "CLERK_UPDATE_FAILED") status = 409;
            else if (response.error?.code === "INTERNAL_ERROR") status = 500;
            else status = 400;
        }

        return NextResponse.json<ApiResponse<UserProfileDTO>>(response, { status });

    } catch (error) {
        console.error("User Profile Update Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}