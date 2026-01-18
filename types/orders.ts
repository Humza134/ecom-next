import { type Order, type OrderItem, type Product, type ProductImage, type User } from "@/lib/db/schema/schemas";

// ✨ Order Product Image DTO
export interface OrderProductImageDTO extends Pick<ProductImage, "url" | "altText" | "isPrimary"> {}

// ✨ Order Product DTO
export interface OrderProductDTO extends Pick<Product, "id" | "title" | "slug"> {
    images: OrderProductImageDTO[];
}

// 🧾 Individual Order item DTO including calculated subtotal
export interface OrderItemDTO extends Pick<OrderItem, "id" | "unitPrice" | "quantity"> {
    // product attached
    product: OrderProductDTO
}

// 📊 Main Order DTO including total
export interface OrderDTO extends Pick<Order, "id" | "userId" | "totalAmount" | "createdAt" | "shippingAddress" | "status"> {
    items: OrderItemDTO[];
    paymentStatus?: string | null;
}

// ✨ Individual Order DTO for Admin View (includes user info)
export interface AdminOrderDTO extends Pick<Order, "id" | "totalAmount" | "createdAt" | "shippingAddress" | "status"> {
    user: Pick<User, "id" | "email" | "fullName">;
    items: OrderItemDTO[];
    paymentStatus?: string | null;
}