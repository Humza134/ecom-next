// lib/services/auth-service.ts

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/schemas';
import { eq } from 'drizzle-orm';

export type CreateUserData = {
  clerkId: string;
  email: string;
  fullName: string | null;
  image?: string;
  role?: "user" | "admin";
};

export async function upsertUser(data: CreateUserData) {
  try {
    // In production, webhooks might retry. 
    // "onConflictDoUpdate" is safer than strict insert to prevent crashing on duplicate webhooks.
    const [user] = await db
      .insert(users)
      .values({
        id: data.clerkId,
        email: data.email,
        fullName: data.fullName,
        role: data.role || "user",
        isVerified: true, // Clerk verifies emails usually before this event
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id, // If ID exists...
        set: {            // ...update these fields instead
          email: data.email,
          fullName: data.fullName,
          updatedAt: new Date(),
        },
      })
      .returning();

    return user;
  } catch (error) {
    console.error("Error in upsertUser:", error);
    throw error; // Let the route handler decide what to return
  }
}

export async function deleteUser(clerkId: string) {
  try {
    await db.delete(users).where(eq(users.id, clerkId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// export const findUserByEmail = async (email: string) => {
//   try {
//     const user = await db
//       .select()
//       .from(users)
//       .where(eq(users.email, email))
//       .limit(1);

//     return user[0] || null;
//   } catch (error) {
//     console.error('Error finding user by email:', error);
//     throw error;
//   }
// };