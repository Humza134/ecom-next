import { db } from "@/lib/db";
import { categories, orderItems, orders, payments, products, users } from "@/lib/db/schema/schemas";
import { AnalyticsSummary, RecentOrder, TopPerformingItem } from "@/types/analytics";
import { ApiResponse } from "@/types/api";
import { desc, eq, sql, ne, and, gte, lte } from "drizzle-orm";



// Helper to format currency
const formatCurrency = (value: number | null) =>
  value !== null ? `$${value.toFixed(2)}` : "$0.00";

export async function getAdminAnalytics(): Promise<ApiResponse<AnalyticsSummary>> {
    try {

        const [
            userCount,
            productCount,
            orderCount,
            revenueResult,
            ordersGrouped,
            paymentsGrouped,
        ] = await Promise.all([
            // 1. Users Count only role user
            db.select({ count: sql<number>`count(*)` })
            .from(users).where(eq(users.role, 'user')),

            // 2. Active Products Count
            db.select({ count: sql<number>`count(*)` })
            .from(products).where(eq(products.isActive, true)),

            //3. Orders Count
            db.select({ count: sql<number>`count(*)` }).from(orders),

            // 4. Revenue
            db.select({ sum: sql<string>`sum(${payments.amount})` })
            .from(payments).where(eq(payments.status, "succeeded")),

            // 5. Orders by status
            db.select({
                status: orders.status,
                count: sql<number>`count(*)`
            }).from(orders).groupBy(orders.status),

            // 6. Payment by status
            db.select({
                status: payments.status,
                count: sql<number>`count(*)`
            }).from(payments).groupBy(payments.status),
        ]);

        // Data Formatting (Reduce array to object)
        // Output example: { pending: 5, shipped: 2, ... }
        const ordersByStatus = ordersGrouped.reduce((acc, curr) => {
            acc[curr.status] = Number(curr.count);
            return acc;
        }, {} as Record<string, number>);

        const paymentByMethod = paymentsGrouped.reduce((acc, curr) => {
            acc[curr.status] = Number(curr.count);
            return acc;
        }, {} as Record<string, number>);


        return {
            success: true,
            message: "Analytics fetched successfully",
            data: {
                totalUsers: Number(userCount[0]?.count || 0),
                totalProducts: Number(productCount[0]?.count || 0),
                totalOrders: Number(orderCount[0]?.count || 0),
                totalRevenue: revenueResult[0]?.sum || "0.00",
                ordersByStatus,
                paymentByMethod,
            }
        }
    } catch (error) {
        console.error("getAdminAnalytics Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }
    }
}

// =========================================================
// 2. HEAVY SERVICE: Recent Orders
// =========================================================
export async function getRecentOrdersService(): Promise<ApiResponse<RecentOrder[]>> {
    try {
        const recentOrdersData = await db.query.orders.findMany({
            limit: 5,
            orderBy: [desc(orders.createdAt)],
            with: {
                user: { columns: { fullName: true, email: true } }
            },
            columns: { id: true, totalAmount: true, status: true, createdAt: true }
        });

        const formattedRecentOrders: RecentOrder[] = recentOrdersData.map(order => ({
            id: order.id,
            customer: { name: order.user.fullName || "Guest", email: order.user.email },
            amount: order.totalAmount,
            status: order.status,
            date: order.createdAt
        }));

        return { 
            success: true, 
            message: "Recent orders fetched", 
            data: formattedRecentOrders 
        };
    } catch (error) {
        console.error("getRecentOrders Error:", error);
        return { 
            success: false, 
            message: "Error fetching recent orders", 
            data: null, 
            error: { code: "INTERNAL_ERROR" }
         };
    }
}

export async function getTopProductsService(): Promise<ApiResponse<TopPerformingItem[]>> {
    try {
        const topProductsData = await db
            .select({
                productId: orderItems.productId,
                name: products.title,
                revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})`.mapWith(Number),
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(ne(orders.status, "cancelled"))
            .groupBy(orderItems.productId, products.title)
            .orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice})`))
            .limit(5);

        const topProducts: TopPerformingItem[] = topProductsData.map((p) => ({
            name: p.name ?? "Unknown Product",
            value: p.revenue,
            subValue: formatCurrency(p.revenue),
        }));

        return { success: true, message: "Top products fetched", data: topProducts };
    } catch (error) {
        console.error("getTopProducts Error:", error);
        return { success: false, message: "Error fetching top products", data: null, error: { code: "INTERNAL_ERROR" } };
    }
}

// =========================================================
// 4. HEAVY SERVICE: Top Categories
// =========================================================
export async function getTopCategoriesService(): Promise<ApiResponse<TopPerformingItem[]>> {
    try {
        const topCategoriesData = await db
            .select({
                categoryId: products.categoryId,
                name: categories.name,
                revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})`.mapWith(Number),
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .leftJoin(orders, eq(orderItems.orderId, orders.id))
            .where(ne(orders.status, "cancelled"))
            .groupBy(products.categoryId, categories.name)
            .orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPrice})`))
            .limit(5);

        const topCategories: TopPerformingItem[] = topCategoriesData.map((c) => ({
            name: c.name ?? "Unknown Category",
            value: c.revenue,
            subValue: formatCurrency(c.revenue),
        }));

        return { success: true, message: "Top categories fetched", data: topCategories };
    } catch (error) {
        console.error("getTopCategories Error:", error);
        return { success: false, message: "Error fetching top categories", data: null, error: { code: "INTERNAL_ERROR" } };
    }
}