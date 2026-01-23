import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, type Order } from "@/lib/db/schema/schemas";
import { eq } from "drizzle-orm";
import { updateOrderStatus } from "@/app/services/order-service";
import { ApiResponse } from "@/types/api";
import { orderIdParamSchema, updateOrderStatusSchema } from "@/app/validations/orderZodSchema";

// Next.js 15+ Params definition
interface RouteContext {
  params: Promise<{
    orderId: string;
  }>;
}

export async function PATCH(
    req: NextRequest, 
    context: RouteContext
) {
    try {
        // --- 1. Authentication ---
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false, 
                message: "Unauthorized", 
                data: null, 
                error: { code: "UNAUTHORIZED" }
            }, { status: 401 });
        }

        // --- 2. Authorization (Admin Check) ---
        // Optimization: Sirf role column fetch karein
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        });

        if (!user || user.role !== 'admin') {
            return NextResponse.json<ApiResponse<null>>({
                success: false, 
                message: "Forbidden: Admin access required", 
                data: null, 
                error: { code: "FORBIDDEN" }
            }, { status: 403 });
        }

        // --- 3. Validate Params (Order ID) ---
        const params = await context.params;
        const paramsValidation = orderIdParamSchema.safeParse(params);
        
        if (!paramsValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false, 
                message: "Invalid Order ID", 
                data: null, 
                error: { code: "VALIDATION_ERROR" }
            }, { status: 400 });
        }

        // --- 4. Validate Body (Status) ---
        const body = await req.json();
        const bodyValidation = updateOrderStatusSchema.safeParse(body);

        if (!bodyValidation.success) {
            return NextResponse.json<ApiResponse<null>>({
                success: false, 
                message: "Invalid status value", 
                data: null, 
                error: { code: "VALIDATION_ERROR", details: bodyValidation.error.format() }
            }, { status: 400 });
        }

        const orderId = paramsValidation.data.orderId;
        // --- 5. Execution ---
        const response = await updateOrderStatus(
            orderId, 
            bodyValidation.data.status
        );

        // Status code handling
        let status = 200;
        if (!response.success) {
            if (response.error?.code === "NOT_FOUND") status = 404;
            else status = 500;
        }

        return NextResponse.json<ApiResponse<Order | null>>(response, { status });

    } catch (error) {
        console.error("Admin Update Order Route Error:", error);
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }, { status: 500 });
    }
}