import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { upsertUser, deleteUser } from "@/app/services/auth-service";

export async function POST(req: Request) {
  // 1. Get Secret from Env
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ WEBHOOK_SECRET is missing from .env");
    return new Response("Server Configuration Error", { status: 500 });
  }

  // 2. Get Headers
  const headerPayload = headers();
  const svix_id = (await headerPayload).get("svix-id");
  const svix_timestamp = (await headerPayload).get("svix-timestamp");
  const svix_signature = (await headerPayload).get("svix-signature");

  // 3. Validate Headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // 4. Get Body (Needs to be raw string for verification)
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 5. Verify Signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // 6. Handle Events
  const eventType = evt.type;
  
  // LOGGING: Good for debugging in production logs
  console.log(`Received webhook with type: ${eventType}`);
  console.log(`Received Data: ${evt.data}`)

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, username, primary_email_address_id } = evt.data;

        // Extract primary email
        const primaryEmail = email_addresses.find(
          (email) => email.id === primary_email_address_id
        );

        if (!primaryEmail) {
            console.error("No primary email found in webhook data");
            return new Response("No primary email", { status: 400 });
        }

        // Construct Full Name
        // const fullName = `${first_name || ""} ${last_name || ""}`.trim();

        // Sync to DB
        await upsertUser({
          clerkId: id,
          email: primaryEmail.email_address,
          fullName: username || "Unknown",
        });
        
        console.log(`✅ User ${eventType} success for ID: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
            await deleteUser(id);
            console.log(`🗑️ User deleted: ${id}`);
        }
        break;
      }

      default:
        // Ignore other events (session.created, etc)
        console.log(`Ignoring event type: ${eventType}`);
    }

    return new Response("Webhook processed", { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    // Returning 500 tells Clerk to retry (good for temporary DB connection issues)
    return new Response("Internal Server Error", { status: 500 });
  }
}