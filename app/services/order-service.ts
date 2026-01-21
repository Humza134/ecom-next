import { db } from "@/lib/db";
import { Order, orders, productImages } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { AdminOrderDTO, OrderDTO, OrderItemDTO } from "@/types/orders";
import { desc, eq, and } from "drizzle-orm";
import { UpdateOrderStatusInput } from "../validations/orderZodSchema";

export async function getUserOrders(userId: string): Promise<ApiResponse<OrderDTO[]>> {
    try {
        // 1. Fetch Orders with Items, Products, and Payments
        const ordersData = await db.query.orders.findMany({
            where: eq(orders.userId, userId),
            orderBy: desc(orders.createdAt),
            with: {
                items: {
                    with: {
                        product: {
                            columns: {
                                id: true,
                                title: true,
                                slug: true,
                            },
                            with: {
                                images: {
                                    columns: { url: true, altText: true, isPrimary: true },
                                    // Primary image priority, limit 1 for thumbnail
                                    orderBy: desc(productImages.isPrimary),
                                    limit: 1
                                }
                            }
                        }
                    }
                },
                payments: {
                    columns: { status: true },
                    limit: 1 // Usually 1 payment per order
                }
            }
        });
        if(!ordersData) {
            return {
                success: false,
                message: "No orders found",
                data: null,
                error: { code: "NOT_FOUND" }
            }
        }
        // 2. Transform Data to DTO
        const formattedOrders: OrderDTO[] = ordersData.map((order) => {
            const formattedItems: OrderItemDTO[] = order.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                // Important: Use the snapshot price from order_items, not current product price
                unitPrice: item.unitPrice,
                product: {
                    id: item.product.id,
                    title: item.product.title,
                    slug: item.product.slug,
                    images: item.product.images,
                }
            }));
            return {
                id: order.id,
                status: order.status,
                totalAmount: order.totalAmount,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                paymentStatus: order.payments[0]?.status || "pending",
                userId: order.userId,
                items: formattedItems
            };
        });
        return {
            success: true,
            message: "Orders fetched successfully",
            data: formattedOrders
        };
    } catch (error) {
        console.error("getUserOrders Service Error:", error);
        return {
            success: false,
            message: "Failed to fetch orders",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}

export async function getOrderById(
    orderId: number,
    userId: string
): Promise<ApiResponse<OrderDTO>> {
    try {
        // fetch order by id and user id
        const orderData = await db.query.orders.findFirst({
            where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
            with: {
                items: {
                    with: {
                        product: {
                            columns: {
                                id: true,
                                slug: true,
                                title: true,
                            },
                            with: {
                                images: {
                                    columns: { url: true, altText: true, isPrimary: true },
                                    orderBy: desc(productImages.isPrimary),
                                    limit: 1,
                                }
                            }
                        }
                    }
                },
                payments: {
                    columns: { status: true },
                    limit: 1,
                }
            }
        });
        if(!orderData) {
            return {
                success: false,
                message: "Order not found",
                data: null,
                error: { code: "NOT_FOUND" }
            }
        }

        // Transform data to DTO
        const formattedOrderItems: OrderItemDTO[] = orderData.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice, // Snapshot price
            product: {
                id: item.product.id,
                title: item.product.title,
                slug: item.product.slug,
                images: item.product.images,
            }
        }));
        const result: OrderDTO = {
            id: orderData.id,
            status: orderData.status,
            totalAmount: orderData.totalAmount,
            shippingAddress: orderData.shippingAddress,
            createdAt: orderData.createdAt,
            paymentStatus: orderData.payments[0]?.status || "pending",
            userId: orderData.userId,
            items: formattedOrderItems
        };

        return {
            success: true,
            message: "Order details fetched successfully",
            data: result
        };
    } catch (error) {
        console.error("getOrderById Service Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}

// this is for admin
export async function getAllOrders(): Promise<ApiResponse<AdminOrderDTO[]>> {
    try {
        // 1. Fetch ALL Orders (sorted by latest)
        // Admin needs to see WHO placed the order, so we include 'user' relation
        const orderData = await db.query.orders.findMany({
            orderBy: desc(orders.createdAt),
            with: {
                // fetch user details
                user: {
                    columns: {id: true, fullName: true, email: true}
                },
                items: {
                    with: {
                        product: {
                            columns: {id: true, title: true, slug: true},
                            with: {
                                images: {
                                    columns: {url: true, altText: true, isPrimary: true},
                                    orderBy: desc(productImages.isPrimary),
                                    limit: 1
                                }
                            }
                        }
                    }
                },
                payments: {
                    columns: {status: true},
                    limit: 1
                }
            }
        });

        if(!orderData) {
            return {
                success: false,
                message: "Orders not found",
                data: null,
                error: { code: "NOT_FOUND" }
            }
        }
        
        // Transform data to admin DTO
        const formattedOrders: AdminOrderDTO[] = orderData.map((order) => {
            const formattedItems: OrderItemDTO[] = order.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                product: {
                    id: item.product.id,
                    title: item.product.title,
                    slug: item.product.slug,
                    images: item.product.images,
                }
            }));
            return {
                id: order.id,
                status: order.status,
                totalAmount: order.totalAmount,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                paymentStatus: order.payments[0]?.status || "pending",
                // ✨ Extra field for Admin
                user: {
                    id: order.user.id,
                    fullName: order.user.fullName,
                    email: order.user.email
                },
                items: formattedItems
            }
        });
        
        return {
            success: true,
            message: "All orders fetched successfully",
            data: formattedOrders
        }
    } catch (error) {
        console.error("getAllOrders Service Error:", error);
        return {
            success: false,
            message: "Failed to fetch orders",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}

export async function updateOrderStatus(
    orderId: number, 
    newStatus: UpdateOrderStatusInput['status']
): Promise<ApiResponse<Order>> { 
    try {
        // Update query with .returning()
        const [updatedOrder] = await db
            .update(orders)
            .set({ 
                status: newStatus,
                updatedAt: new Date() // Timestamp update zaroori hai
            })
            .where(eq(orders.id, orderId))
            .returning(); // Returns the updated row directly

        if (!updatedOrder) {
            return {
                success: false,
                message: "Order not found",
                data: null,
                error: { code: "NOT_FOUND" }
            };
        }

        return {
            success: true,
            message: "Order status updated successfully",
            data: updatedOrder // Type safety confirmed as 'Order'
        };

    } catch (error) {
        console.error("updateOrderStatus Service Error:", error);
        return {
            success: false,
            message: "Failed to update order status",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}