import { db } from "@/lib/db";
import { ApiResponse } from "@/types/api";
import { CartDTO, CartItemDTO } from "@/types/carts";
import { eq, and, desc } from "drizzle-orm";
import { carts, cartItems, productImages, products } from "@/lib/db/schema/schemas";
import { AddToCartInput, UpdateCartItemBodySchema } from "../validations/cartZodSchema";

export async function getCart(userId: string): Promise<ApiResponse<CartDTO>> {
    try {
        // 1. Fetch Active Cart with Products and Images
        const cartData = await db.query.carts.findFirst({
            where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
            with: {
                cartItems: {
                    orderBy: desc(cartItems.createdAt), // Latest items first
                    with: {
                        product: {
                            columns: {
                                id: true,
                                title: true,
                                slug: true,
                                price: true,
                                stock: true,
                            },
                            with: {
                                images: {
                                    columns: { url: true, altText: true, isPrimary: true },
                                    // Optimize: put primary image first
                                    orderBy: desc(productImages.isPrimary),
                                    limit: 1,
                                }
                            }
                        }
                    }
                }
            }
        });
        // 2. Handle Empty Cart Case
        if (!cartData) {
            return {
                success: true,
                message: "Cart not found",
                data: null
            }
        };
        // 3. Transform Data & Calculate Totals
        let runningTotal = 0;

        const formattedItems: CartItemDTO[] = cartData.cartItems.map((item) => {
            // Convert DB string price to number for calculation
            const unitPrice = parseFloat(item.product.price);
            const itemSubtotal = unitPrice * item.quantity;

            runningTotal += itemSubtotal;
            return {
                id: item.id,
                quantity: item.quantity,
                subtotal: itemSubtotal.toFixed(2), // "199.50"
                product: {
                    id: item.product.id,
                    title: item.product.title,
                    slug: item.product.slug,
                    price: item.product.price, // Keep original DB string
                    stock: item.product.stock,
                    images: item.product.images,
                },
            }
        });
        // 4. Final DTO Construction
        const result: CartDTO = {
            id: cartData.id,
            userId: cartData.userId,
            items: formattedItems,
            total: runningTotal.toFixed(2), // "5000.00"
        };

        return {
            success: true,
            message: "Cart fetched successfully",
            data: result
        }
    } catch (error) {
        console.error("getCartService Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }
    }
}

export async function addToCart(
    userId: string,
    params: AddToCartInput
): Promise<ApiResponse<CartDTO>> {
    try {
        const { productId, quantity } = params;
        // 1. Database transaction

        await db.transaction(async (tx) => {
            // A. Product Validation (Existence & Stock)
            const product = await db.query.products.findFirst({
                where: eq(products.id, productId),
                columns: { id: true, stock: true, isActive: true, price: true },
            });
            if (!product) throw new Error("PRODUCT_NOT_FOUND");
            if (!product.isActive) throw new Error("PRODUCT_INACTIVE");
            // Check immediate stock availability
            if (product.stock < quantity) throw new Error("INSUFFICIENT_STOCK");
            // B. Find or Create Active Cart
            let cartId: number;

            const existingCart = await tx.query.carts.findFirst({
                where: and(eq(carts.userId, userId), eq(carts.isActive, true)),
                columns: { id: true },
            });

            if (existingCart) {
                cartId = existingCart.id;
            } else {
                // create new cart
                const [newCart] = await tx
                    .insert(carts)
                    .values({ userId, isActive: true })
                    .returning({ id: carts.id });

                cartId = newCart.id;
            }
            // C. Check if Item Already Exists in Cart
            const existingItem = await tx.query.cartItems.findFirst({
                where: and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
            });
            if (existingItem) {
                // D. Update Case: Increment Quantity
                const newQuantity = existingItem.quantity + quantity;
                // CRITICAL: Check stock again for the TOTAL quantity
                if (product.stock < newQuantity) throw new Error("INSUFFICIENT_STOCK_UPDATE");
                await tx
                    .update(cartItems)
                    .set({
                        quantity: newQuantity,
                        updatedAt: new Date() // Timestamp update
                    })
                    .where(eq(cartItems.id, existingItem.id));
            } else {
                // E. Insert Case: Naya item add karo
                await tx.insert(cartItems).values({
                    cartId,
                    productId,
                    quantity,
                });
            }
        });
        // --- Transaction End ---
        // --- 2. Return Fresh Data ---
        // Call getCartService to get fresh data
        const updatedCartResponse = await getCart(userId);

        if (!updatedCartResponse.success || !updatedCartResponse.data) {
            return {
                success: false,
                message: "cart retrieval failed",
                data: null,
                error: { code: "CART_RETRIEVAL_FAILED" }
            }
        }
        return {
            success: true,
            message: "Item added to cart successfully",
            data: updatedCartResponse.data, // Consistency maintained ✅
        }
    } catch (error: any) {
        console.error("addToCart Error:", error);
        // Specific Error Handling for Frontend
        if (error.message === "PRODUCT_NOT_FOUND") {
            return {
                success: false,
                message: "Product not found",
                data: null,
                error: { code: "PRODUCT_NOT_FOUND" }
            }
        }
        if (error.message === "PRODUCT_INACTIVE") {
            return {
                success: false,
                message: "Product is unavailable",
                data: null,
                error: { code: "BAD_REQUEST" }
            }
        }
        // Stock limit errors k liye 409 Conflict best rehta hai ya 400
        if (error.message === "INSUFFICIENT_STOCK" || error.message === "INSUFFICIENT_STOCK_UPDATE") {
            return {
                success: false,
                message: "Requested quantity exceeds available stock",
                data: null,
                error: { code: "STOCK_LIMIT" }
            };
        }
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }
    }
}

export async function updateCartItem(
    cartItemId: number,
    userId: string,
    data: UpdateCartItemBodySchema
): Promise<ApiResponse<CartDTO>> {
    try {
        const { quantity } = data;

        // --- 1. Find Cart Item & Verify Ownership ---
        const existingCartItem = await db.query.cartItems.findFirst({
            where: eq(cartItems.id, cartItemId),
            with: {
                cart: true,
                product: true // to check the stock
            },
        });

        if(!existingCartItem) {
            return {
                success: false,
                message: "Item not found",
                data: null,
                error: {code: "NOT_FOUND"}
            }
        }
        if(existingCartItem.cart.userId !== userId) {
            return {
                success: false,
                message: "Unauthorized",
                data: null,
                error: {code: "FORBIDDEN"}
            }
        }
        // --- 2. Stock Check ---
        if(quantity > existingCartItem.product.stock) {
            return {
                success: false,
                message: `Insufficient stock. Only ${existingCartItem.product.stock} available.`,
                data: null,
                error: {code: "CONFLICT"}
            }
        }

        // --- 3. Perform Update ---
        await db.update(cartItems)
        .set({ quantity: quantity, updatedAt: new Date() })
        .where(eq(cartItems.id, cartItemId));

        // --- 4. ✨ THE MAGIC: Return Fresh Cart State ---
        const freshCartResponse = await getCart(userId);

        if(!freshCartResponse.success || !freshCartResponse.data) {
            throw new Error("Failed to fetch updated cart")
        }

        return {
            success: true,
            message: "Cart updated successfully",
            data: freshCartResponse.data
        }
    } catch (error) {
        console.error("updateCartItem Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }
    }
}

export async function deleteCartItem(
    cartItemId: number,
    userId: string
): Promise<ApiResponse<CartDTO>> {
    try {
        // --- 1. Find Item & Verify Ownership ---
        const existingItem = await db.query.cartItems.findFirst({
            where: eq(cartItems.id, cartItemId),
            with: {
                cart: true, // Cart relation to access userId
            }
        });

        if(!existingItem) {
            return {
                success: false,
                message: "Item not found",
                data: null,
                error: {code: "NOT_FOUND"}
            }
        }

        // --- 2. Security Check ---
        if(existingItem.cart.userId !== userId) {
            return {
                success: false,
                message: "Unauthorized: You do not own this cart item",
                data: null,
                error: {code: "FORBIDDEN"}
            }
        }

        // --- 3. Perform Delete ---
        await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

        // --- 4. Return Fresh Cart State ---
        const freshCartResponse = await getCart(userId);
        if(!freshCartResponse.success || !freshCartResponse.data) {
            throw new Error("Failed to fetch updated cart after deletion")
        }
        return {
            success: true,
            message: "Item removed from cart successfully",
            data: freshCartResponse.data
        }
    } catch (error) {
        console.error("deleteCartItem Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        }
    }
}