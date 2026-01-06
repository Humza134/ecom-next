import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
// import { getCategories, getCategoryTree } from "@/app/services/category-service";
import { createCategory, getCategoryTree } from "@/app/services/category-service";
import { ApiResponse } from "@/types/api";
import { CategoriesDTO, CategoryTreeDTO, CreateCategoryDTO } from "@/types/categories";
import { categoriesQuerySchema, createCategorySchema } from "@/app/validations/categoriesZodSchema";

// for future this route will be used in admin pannel
// export async function GET(req: NextRequest) {
//     // 1. Get Query Params
//     const { searchParams } = new URL(req.url);
    
//     // 2. Validate Query Params
//     const parse = categoriesQuerySchema.safeParse(Object.fromEntries(searchParams));

//     // 3. Handle Invalid Query Params
//     if (!parse.success) {
//         return NextResponse.json({
//             success: false,
//             message: "Invalid query parameters",
//             error: { code: "VALIDATION_ERROR", details: parse.error.flatten() }
//         }, { status: 400 });
//     }

//     // 4. Valid data Service call
//     const response = await getCategories(parse.data);

//     // 5. Handle Invalid Service Response
//     let status = 200;
//     if(!response.success) {
//       status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
//     }
//     return NextResponse.json<ApiResponse<CategoriesDTO[]>>(response, { status });
// }


export async function GET(req: NextRequest) {
    const response = await getCategoryTree();
    
    let status = 200;
    if(!response.success) {
      status = response.error?.code === "INTERNAL_ERROR" ? 500 : 400;
    }
    return NextResponse.json<ApiResponse<CategoryTreeDTO[]>>(response, { status });
}

export async function POST(req: NextRequest) {
  try {
    // --- 1. Authentication Check ---
    const { userId } = await auth();
    if(!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: "Unauthorized",
        data: null,
        error: { code: "UNAUTHORIZED" }
    }, { status: 401 });
    }
    // --- 2. Parse Request Body ---
    const body = await req.json();
    const parse = createCategorySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: "Validation Error",
          data: null,
          error: { code: "VALIDATION_ERROR", details: parse.error.flatten() },
      }, { status: 400 });
    }
    // --- 3. Call Service ---
    const response = await createCategory(parse.data, userId);
    // --- 4. Return Response ---
    let status = 201; // Created
    if (!response.success) {
        if (response.error?.code === "FORBIDDEN") status = 403;
        else if (response.error?.code === "CONFLICT") status = 409;
        else if (response.error?.code === "NOT_FOUND") status = 404;
        else if (response.error?.code === "FOREIGN_KEY_ERROR") status = 400;
        else status = 500;
    }
    return NextResponse.json<ApiResponse<CreateCategoryDTO | null>>(response, { status });
  } catch (error) {
    console.error("Category Route Error:", error);
    return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: "Internal Server Error",
        data: null,
        error: { code: "INTERNAL_ERROR" },
    }, { status: 500 });
  }
}