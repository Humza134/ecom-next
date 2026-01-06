import { getCategoryById, updateCategory } from "@/app/services/category-service";
import { getCategoryByIdSchema, updateCategoryBodySchema } from "@/app/validations/categoriesZodSchema";
import { ApiResponse } from "@/types/api";
import { getSingleCategoryDTO, UpdateCategoryDTO } from "@/types/categories";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define context type for dynamic params
interface RouteContext {
    params: {
        id: string;
    };
}

export async function GET(
    req: NextRequest,
    context: RouteContext
) {
    try {
        const params = await context.params;
        console.log("PARAMS: ", params)
        // validation with zod
        const validation = getCategoryByIdSchema.safeParse(params);
        if (!validation.success) {
            return NextResponse.json<ApiResponse<getSingleCategoryDTO>>(
                {
                    success: false,
                    message: "Invalid category ID",
                    data: null,
                    error: {
                        code: "VALIDATION_ERROR",
                        details: validation.error.flatten(),
                    },
                },
                { status: 400 }
            );
        }
        // call service
        const cleanId = validation.data.categoryId;
        console.log("CLEANED-ID: ", cleanId)
        const response = await getCategoryById(cleanId);
        let status = 200;
        if (!response.success) {
            if (response.error?.code === "NOT_FOUND") status = 404;
            else status = 500;
        }
        return NextResponse.json<ApiResponse<getSingleCategoryDTO>>(response, { status });
    } catch (error) {
        console.error("Category Get Route Error:", error);
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
     // 2. Validate Params (ID)
     const params = await context.params;
     const validation = getCategoryByIdSchema.safeParse(params);
     if (!validation.success) {
         return NextResponse.json<ApiResponse<getSingleCategoryDTO>>(
             {
                 success: false,
                 message: "Invalid category ID",
                 data: null,
                 error: {
                     code: "VALIDATION_ERROR",
                     details: validation.error.flatten(),
                 },
             },
             { status: 400 }
         );
     }
     const cleanId = validation.data.categoryId;
     console.log("CLEANED-ID: ", cleanId)
     // 3. Validate Body
     const body = await req.json();
     const bodyValidation = updateCategoryBodySchema.safeParse(body);
 
     if (!bodyValidation.success) {
         return NextResponse.json<ApiResponse<null>>({
             success: false,
             message: "Validation Error",
             data: null,
             error: {
                 code: "VALIDATION_ERROR",
                 details: bodyValidation.error.flatten()
             }
         }, { status: 400 });
     }
     // 4.call service
     const response = await updateCategory(cleanId, userId, bodyValidation.data);
        // 5. Return Response
        let status = 200;
        if (!response.success) {
            if (response.error?.code === "FORBIDDEN") status = 403;
            else if (response.error?.code === "NOT_FOUND") status = 404;
            else if (response.error?.code === "CONFLICT") status = 409;
            else status = 500;
        }
        return NextResponse.json<ApiResponse<UpdateCategoryDTO>>(response, { status });
   } catch (error) {
        console.error("Category Update Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}