import { User } from "@/lib/db/schema/schemas";

export interface UserProfileDTO extends Omit<User, "updatedAt"> {}