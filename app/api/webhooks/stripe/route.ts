import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  orders,
  payments,
  products,
  orderItems,
  carts,
} from "@/lib/db/schema/schemas"; 
import { eq, sql } from "drizzle-orm"; 
import { db } from "@/lib/db";


export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
      return new NextResponse("Missing Stripe Signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  const data = event.data.object as any;
  // Metadata always returns string, thats why we use parseInt
  const orderId = data.metadata?.orderId ? parseInt(data.metadata.orderId) : null;
  const userId = data.metadata?.userId;

  if (!orderId) {
      return new NextResponse("Order ID missing in metadata", { status: 200 }); 
      // 200 return krte hain taa k Stripe retry na kare agar data hi galat h
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        console.log(`💰 Payment succeeded for Order ${orderId}`);

        // 🟢 TRANSACTION START 
        await db.transaction(async (tx) => {
          
          // 1. Update Payment Status
          await tx.update(payments)
            .set({ status: "succeeded" })
            .where(eq(payments.stripePaymentIntentId, data.id));

          // 2. Update Order Status
          await tx.update(orders)
            .set({ status: "processing" }) // or 'paid'
            .where(eq(orders.id, orderId));

          // 3. Deduct Stock (Inventory Management)
          // first extract the order items
          const items = await tx.select()
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

          // loop for all items
          for (const item of items) {
            // ⚠️ BEST PRACTICE: SQL Atomic Update
            // Hum JS calculation ki bajaye Database ko bolte hain minus karne ko.
            // Ye Race Conditions se bachata hai (agar 2 log same time buy karein).
            await tx.update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}`,
              })
              .where(eq(products.id, item.productId));
          }

          // 4. Deactivate User's Cart
          if (userId) {
            await tx.update(carts)
              .set({ isActive: false })
              .where(eq(carts.userId, userId));
          }
        });
        // 🟢 TRANSACTION END
        break;

      case "payment_intent.payment_failed":
        console.log(`❌ Payment failed for Order ${orderId}`);
        
        await db.transaction(async (tx) => {
            await tx.update(payments)
                .set({ status: "failed" })
                .where(eq(payments.stripePaymentIntentId, data.id));
            
            // Optional: Order ko cancelled mark karein ya user ko retry karne dein
            // await tx.update(orders).set({ status: "cancelled" })...
        });
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}