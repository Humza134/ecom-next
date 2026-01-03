import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createProduct, getProducts } from "@/app/services/product-service";
import { ApiResponse } from "@/types/api";
import { ProductDTO, ProductCreateDTO } from "@/types/products";
import { productSchema, querySchema } from "@/app/validations/productsZodSchema";

export async function GET(req: NextRequest){
  // Get query params
  const {searchParams} = new URL(req.url);
  const parse = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parse.success) {
        return NextResponse.json({
            success: false,
            message: "Invalid query parameters",
            error: { code: "VALIDATION_ERROR", details: parse.error.flatten() }
        }, { status: 400 });
    }

  const response = await getProducts(parse.data);
  let status = 200;
  if(!response.success) {
    status = response.error?.code === "VALIDATION_ERROR" ? 400 : 500;
  }
  return NextResponse.json<ApiResponse<ProductDTO[]>>(response, { status });
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check with clerk
    const { userId } = await auth();
  
    if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }
    // --- 3. Parse Request Body ---
    const body = await req.json();
    const parse = productSchema.safeParse(body);

    if (!parse.success) {
      return {
        success: false,
        message: "Validation Error",
        data: null,
        error: { code: "VALIDATION_ERROR", details: parse.error.flatten() },
      };
    }

    const response = await createProduct(
      parse.data,
      userId
    );

     // 4. Return Response
      let status = 201; // Created
      if (!response.success) {
          if (response.error?.code === "FORBIDDEN") status = 403;
          else if (response.error?.code === "CONFLICT") status = 409;
          else if (response.error?.code === "NOT_FOUND") status = 404;
          else status = 500;
      }

    return NextResponse.json<ApiResponse<ProductCreateDTO>>(response, { status });
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: "Internal Server Error",
      data: null,
      error: { code: "INTERNAL_ERROR" },
    }, { status: 500 });
  }
}