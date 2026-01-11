import { deleteCartItem, updateCartItem } from "@/app/services/cart-service";
import { cartItemIdSchema, updateCartItemBodySchema } from "@/app/validations/cartZodSchema";
import { ApiResponse } from "@/types/api";
import { CartDTO } from "@/types/carts";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";



interface RouteContext {
  params: Promise<{
    itemId: string;
  }>;
}

export async function PATCH(
    req: NextRequest,
    context: RouteContext
) {
    try {
        // 1. Authentication Check
        const { userId } = await auth();
        if (!userId) {
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              message: "Unauthorized",
              data: null,
              error: { code: "UNAUTHORIZED" },
            },
            { status: 401 }
          );
        }
        // 2. Validate Params (ID)
        // In nextjs 15+ has params promise, so we need to await
        const params = await context.params;
        const paramsValidation = cartItemIdSchema.safeParse(params);
        if(!paramsValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Params ID Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR", details: paramsValidation.error.flatten() },
            }, { status: 400 });
        }
    
        const cartItemId = paramsValidation.data.itemId;
    
        // 3. Validate Body (Quantity)
        const body = await req.json();
        const bodyValidation = updateCartItemBodySchema.safeParse(body);
        if(!bodyValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                message: "Body Validation Error",
                data: null,
                error: { code: "VALIDATION_ERROR", details: bodyValidation.error.flatten() },
            }, { status: 400 });
        }
    
        // 4. Call Service
        const response = await updateCartItem(
            cartItemId,
            userId,
            bodyValidation.data
        );
    
        // 5. Return Response
        let status = 200;
        if (!response.success) {
          if (response.error?.code === "FORBIDDEN") status = 403;
          else if (response.error?.code === "NOT_FOUND") status = 404;
          else if (response.error?.code === "CONFLICT") status = 409; // Stock issue
          else if (response.error?.code === "BAD_REQUEST") status = 400;
          else status = 500;
        }
        return NextResponse.json<ApiResponse<CartDTO>>(response, { status });
    } catch (error) {
        console.error("Cart Item Update Route Error:", error);
        return NextResponse.json<ApiResponse<null>>(
        {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" },
        },
        { status: 500 }
        );
    }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Authentication Check
    const { userId } = await auth();
    if(!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: "Unauthorized",
        data: null,
        error: { code: "UNAUTHORIZED" }
      }, {status: 401});
    }

    // 2. Validate Params (Item ID)
    const params = await context.params;
    const validation = cartItemIdSchema.safeParse(params);
    if(!validation.success) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: "Params ID Validation Error",
        data: null,
        error: { code: "VALIDATION_ERROR", details: validation.error.flatten() },
      }, { status: 400 });
    }

    const cartItemId = validation.data.itemId;
    // 3. Call Service
    const response = await deleteCartItem(cartItemId, userId);

    // 4. Return Response
    let status = 200;
    if (!response.success) {
        if (response.error?.code === "FORBIDDEN") status = 403;
        else if (response.error?.code === "NOT_FOUND") status = 404;
        else status = 500;
    }
    return NextResponse.json<ApiResponse<CartDTO>>(response, { status });
  } catch (error) {
    console.error("Cart Item Delete Route Error:", error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: "Internal Server Error",
      data: null,
      error: { code: "INTERNAL_ERROR" },
    }, {status: 500});
  }
}