import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { UserProfileDTO } from "@/types/profile";
import { eq } from "drizzle-orm";
import { UpdateUserProfileInput } from "../validations/userZodSchema";
import { clerkClient } from "@clerk/nextjs/server";

export async function getUserProfile(userId: string):Promise<ApiResponse<UserProfileDTO>>{
    try {
        //1. fetch user Data
        // we only select the data we need for the profile page
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isVerified: true,
                createdAt: true
            }
        });
        
        if(!user) {
            return {
                success: false,
                message: "User not found",
                data: null,
                error: { code: "USER_NOT_FOUND" }
            }
        }

        // Transform data to UserProfileDTO
        const userProfile: UserProfileDTO = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt
        };

        return {
            success: true,
            message: "User profile fetched",
            data: userProfile
        }

    } catch (error) {
        console.error("getUserProfile Service Error:", error);
        return {
            success: false,
            message: "Internal Server Error",
            data: null,
            error: { code: "INTERNAL_SERVER_ERROR" }
        }
    }
}

export async function updateUserProfile(userId: string, data: UpdateUserProfileInput):Promise<ApiResponse<UserProfileDTO>>{
    try {

        // update user data
        const nameParts = data.fullName.trim().split(/\s+/); // Split by spaces
        const firstName = nameParts[0]; // "Muhammad"
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""; // "Hamza"

        // 1. Update Clerk (Syncing Real Name details)
        const client = await clerkClient();
        try {
            // we not changed the username we changed the real name
            await client.users.updateUser(userId, {
                firstName: firstName,
                lastName: lastName,
                // Note: if you need to add fullName in publicmeta data
                publicMetadata: {
                    fullName: data.fullName
                } 
            })
        } catch (clerkError) {
            console.error("Clerk Update Failed:", clerkError);
            return {
                success: false,
                message: "Clerk Update Failed",
                data: null,
                error: { code: "CLERK_UPDATE_FAILED" }
            }
        }

        //2. Update Database
        const [updatedUser] = await db.update(users)
            .set({
            fullName: data.fullName, // "Muhammad Hamza" saved here
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
            isVerified: users.isVerified,
            createdAt: users.createdAt
        });

        if(!updatedUser) {
            return {
                success: false,
                message: "User not found",
                data: null,
                error: { code: "USER_NOT_FOUND" }
            }
        };
        return {
            success: true,
            message: "User profile updated",
            data: updatedUser
        }
    } catch (error) {
        console.error("updateUserProfile Service Error:", error);
        return {
            success: false,
            message: "Failed to update profile",
            data: null,
            error: { code: "INTERNAL_ERROR" }
        };
    }
}