import { orderStatusEnum } from "@/lib/db/schema/schemas";

// 1. Single Order Row
export interface RecentOrder {
    id: number;
    customer: {
        name: string;
        email: string;
    };
    amount: string;
    status: string; // You can use your OrderStatusEnum type here if exported
    date: Date;
}

export interface TopPerformingItem {
    name: string;
    value: number; // For charts (Revenue or Quantity)
    subValue?: string; // Optional: Formatted Revenue string (e.g. "$1,200")
}

export interface AnalyticsSummary {
    totalOrders: number;
    totalRevenue: string;
    totalUsers: number;
    totalProducts: number;
    ordersByStatus: Record<string, number>; // Example: { "pending": 4, "delivered": 10 }
    paymentByMethod: Record<string, number>; // Example: { "succeeded": 15, "failed": 1 }
}

export interface SalesChartDataPoint {
    name: string;  // X-Axis label (e.g., "Mon", "Jan 1", "Jan")
    sales: number; // Y-Axis value (Total Revenue)
    orderCount: number; // Optional: Number of orders
}

// export interface SalesChartDataPoint {
//   date: string;           // ISO date string YYYY-MM-DD
//   sales: number;
//   orderCount: number;
// };