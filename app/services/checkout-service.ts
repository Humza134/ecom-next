import { ApiResponse } from "@/types/api";
import { CheckoutInput } from "../validations/checkoutZodSchema";
import { CheckoutResponseDTO } from "@/types/checkout";
import { db } from "@/lib/db";
import { orderItems, orders, payments } from "@/lib/db/schema/schemas";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(
    userId: string,
    data: CheckoutInput
): Promise<ApiResponse<CheckoutResponseDTO>> {
    try {
        // 1. Get Active Cart & Verify Stock/Prices
        const userCart = await db.query.carts.findFirst({
            where: (c, { and, eq }) =>
                and(eq(c.userId, userId), eq(c.isActive, true)),
            with: {
                cartItems: {
                    with: {
                        product: true
                    },
                },
            },
        });

        if(!userCart || userCart.cartItems.length === 0) {
            return {
                success: false,
                message: "Cart is empty",
                data: null,
                error: {code: "CART_EMPTY"}
            }
        };
        // 2) Calculate Total & Stock Check
        let totalAmount = 0;
        for(const item of userCart.cartItems) {
            if(!item.product) continue;
            const price = Number(item.product.price); 

            if(item.product.stock < item.quantity) {
                return {
                    success: false,
                    message: `Out of stock: ${item.product.title}`,
                    data: null,
                    error: { code: "OUT_OF_STOCK" }
                }
            }
            totalAmount += price * item.quantity;
        };
        
        // 3. DB Transaction: Create Order & OrderItems
        const newOrder = await db.transaction(async (tx) => {
            // create order
            const [order] = await tx.insert(orders).values({
                userId: userId,
                totalAmount: totalAmount.toFixed(2),
                status: "pending",
                shippingAddress: data.shippingAddress,
            }). returning();

            // Prepare Order Items
            const itemsToInsert = userCart.cartItems.map((item) => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.product.price,
            }));

            // Insert Order Items
            if(itemsToInsert.length > 0) {
                await tx.insert(orderItems).values(itemsToInsert);
            }

            return order;
        });
        // 4. Create Stripe Payment Intent
        const amountInCents = Math.round(totalAmount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            metadata: {
                orderId: newOrder.id.toString(),
                userId: userId,
            },
        });

        // 5.  Create Initial Payment Record (Pending)
        // this step is out of the transaction because we want to stripePaymentIntentId 
        await db.insert(payments).values({
            orderId: newOrder.id,
            stripePaymentIntentId: paymentIntent.id, // 🔑 Main Key for tracking
            amount: totalAmount.toFixed(2),
            status: "pending", // Shuru mein pending
            metadata: { userId: userId } // Optional
        });

        // 6. Success Response 
        return {
            success: true,
            message: "Checkout initiated successfully",
            data: {
                clientSecret: paymentIntent.client_secret,
                orderId: newOrder.id,
                totalAmount: totalAmount.toFixed(2),
            }
        }
    } catch (error) {
        console.error("createCheckoutSession Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_SERVER_ERROR" }
        }
    }
}