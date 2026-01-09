import { type Cart, type CartItem, type Product, type ProductImage } from "@/lib/db/schema/schemas";

// ✨ Cart Product Image DTO
export interface CartProductImageDTO extends Pick<ProductImage, "url" | "altText" | "isPrimary"> {}

// ✨ Cart Product DTO
export interface CartProductDTO extends Pick<Product, "id" | "title" | "slug" | "price" | "stock"> {
    images: CartProductImageDTO[];
}

// 🧾 Individual cart item DTO including calculated subtotal
export interface CartItemDTO extends Pick<CartItem, "id" | "quantity"> {
    // product attached
    product: CartProductDTO;
    // subtotal (price * quantity)
    subtotal: string;
}

// 📊 Main Cart DTO including total

export interface CartDTO extends Pick<Cart, "id" | "userId"> {
    items: CartItemDTO[];
    total: string;
}