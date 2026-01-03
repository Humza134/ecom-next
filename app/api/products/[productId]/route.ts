import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ApiResponse } from "@/types/api";
import { getSingleProductDTO } from "@/types/products";
import { getProductById, updateProduct } from "@/app/services/product-service";
import { paramsProductIdSchema, productUpdateSchema  } from "@/app/validations/productsZodSchema";

type Context = {
  params: {
    productId: string // this is the dynamic segment of the route and this type always string
  }
};

export async function GET(
    req: NextRequest,
    context: Context
) {
    const params = await context.params; 
    // validation with zod
    const validation = paramsProductIdSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<getSingleProductDTO>>(
        {
          success: false,
          message: "Invalid product ID",
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }
    const cleanId = validation.data.productId;
    console.log("CleanedId: ", cleanId)
    const response = await getProductById(cleanId);
    return NextResponse.json<ApiResponse<getSingleProductDTO>>(response, { status: response.success ? 200 : 400 });
}

export async function PATCH (
  req: NextRequest,
  context: Context
) {
  // 1. Authentication Check
  const { userId } = await auth();
  if(!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized", data: null }, { status: 401 });
  }
  // 2. Validate Params (ID)
  const params = await context.params;
  const validation = paramsProductIdSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<getSingleProductDTO>>(
        {
          success: false,
          message: "Invalid product ID",
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }
    const productId = validation.data.productId;
    console.log("CleanedProductID: ", productId)

  // 3. Validate Body
  const body = await req.json();
  const bodyValidation = productUpdateSchema.safeParse(body);

  if (!bodyValidation.success) {
    return NextResponse.json<ApiResponse<getSingleProductDTO>>(
      {
        success: false,
        message: "Invalid product data",
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          details: bodyValidation.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  // 4. Call Service
  const response = await updateProduct(productId, userId, bodyValidation.data);

  return NextResponse.json<ApiResponse<getSingleProductDTO>>(response, { status: response.success ? 200 : 400 });
}