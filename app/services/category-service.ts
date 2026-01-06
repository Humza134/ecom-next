import { db } from "@/lib/db";
import { categories, users, products, productImages } from "@/lib/db/schema/schemas";
import { asc, desc, eq, sql, isNull, and, ne } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { CreateCategorySchema, UpdateCategoryBodySchema, type CategoriesQuerySchema } from "../validations/categoriesZodSchema"; 
import { type ApiResponse } from "@/types/api";
import { CategoriesDTO, CategoryTreeDTO, CreateCategoryDTO, getSingleCategoryDTO, UpdateCategoryDTO } from "@/types/categories";

// --- 1. Admin/Flat List Service (Pagination Support) ---
// export async function getCategories(params: CategoriesQuerySchema): Promise<ApiResponse<CategoriesDTO[]>> {
//     try {
//         const { page, limit, sort } = params; // destructure params
//         const offset = (page - 1) * limit;

//         let orderBy;
//         switch (sort) {
//             case "oldest":
//                 orderBy = asc(categories.createdAt);
//                 break;
//             default:
//                 orderBy = desc(categories.createdAt);
//         }

//         const [data, totalCountResult] = await Promise.all([
//             db.query.categories.findMany({
//                 limit,
//                 offset,
//                 orderBy,
//                 columns: {
//                     id: true,
//                     name: true,
//                     slug: true,
//                     description: true
//                 },
//             }),
//             db.select({ count: sql<number>`count(*)` }).from(categories)
//         ]);

//         const total = Number(totalCountResult[0]?.count || 0);
//         const totalPages = Math.ceil(total / limit);

//         return {
//             success: true,
//             message: "Categories fetched successfully",
//             data,
//             meta: { total, totalPages, page, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
//         };
//     } catch (error) {
//         console.error("getCategories Error:", error);
//         return { success: false, message: "Internal Server Error", data: null, error: { code: "INTERNAL_ERROR" } };
//     }
// }

// --- 2. Public Tree Service (Level 3 Hierarchy) ---
// Note: This is a recursive function to get the category tree
export async function getCategoryTree(): Promise<ApiResponse<CategoryTreeDTO[]>> {
    try {
        const data = await db.query.categories.findMany({
            // Step 1: Level 0 (Root)
            where: isNull(categories.parentId),
            columns: {
                id: true,
                name: true,
                slug: true,
            },
            with: {
                // Step 2: Level 1 Children
                children: {
                    columns: { id: true, name: true, slug: true },
                    with: {
                        // Step 3: Level 2 Children (Grandchildren)
                        children: {
                            columns: { id: true, name: true, slug: true }
                            // Step 4: Level 3 Children (Great-grandchildren) etc
                        }
                    }
                }
            }
        });

        return {
            success: true,
            message: "Category tree fetched successfully",
            data,
        };
    } catch (error) {
        console.error("getCategoryTree Error:", error);
        return { success: false, message: "Internal Server Error", data: null, error: { code: "INTERNAL_ERROR" } };
    }
}

export async function createCategory(
    params: CreateCategorySchema, 
    userId: string
): Promise<ApiResponse<CreateCategoryDTO>> {
    try {
        const {name, description, slug: providedSlug, parentId} = params;

        // ---1. Authorization Check
        // Categories should typically only be created by Admins.
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        })
        // in future i will add this
        // if (!user || user.role !== 'admin') {
        //      return {
        //         success: false,
        //         message: "Unauthorized: Only admins can create categories",
        //         data: null,
        //         error: { code: "FORBIDDEN" }
        //     };
        // }
        if(!user) {
            return {
                success: false,
                message: "Unauthorized",
                data: null,
                error: { code: "FORBIDDEN" }
            }
        }
        // --- 2. Slug Logic (Unique & URL Friendly) ---
        // If slug is provided, clean it. If not, generate from name.
        let slug = providedSlug
        ? slugify(providedSlug, { lower: true, strict: true })
        : slugify(name, { lower: true, strict: true });

        // check if slug exists
        const existingCategory = await db.query.categories.findFirst({
            where: eq(categories.slug, slug),
            columns: { id: true }
        });
        // If exists, append random string (same as your product logic)
        if (existingCategory) {
            slug += `-${nanoid(4)}`;
        }

        // --- 3. Parent Category Validation (Optional but Recommended) ---
        // Although DB handles FK, checking here gives a better error message
        if(parentId) {
            const parentExist = await db.query.categories.findFirst({
                where: eq(categories.id, parentId),
                columns: { id: true }
            });
            if(!parentExist) {
                return {
                    success: false,
                    message: "Parent category does not exist",
                    data: null,
                    error: {code: "NOT_FOUND"}
                }
            }
        }
        // --- 4. Database Insert ---
        // Using transaction is good habit, though single insert implies implicit transaction
        const [newCategory] = await db.insert(categories).values({
            name,
            slug,
            description: description || null,
            parentId: parentId || null,
        }).returning({
            id: categories.id,
            name: categories.name
        });
        return {
            success: true,
            message: "Category created successfully",
            data: newCategory
        }
    } catch (err: any) {
        console.error("createCategory Error:", err);
        // Handle Foreign Key Constraint (Safety net)
        if (err.code === "23503") {
             return {
                success: false,
                message: "Invalid Parent ID or Reference",
                data: null,
                error: { code: "FOREIGN_KEY_ERROR" },
            };
        }
        // Handle Unique Constraint (Just in case race condition happens on slug)
        if (err.code === "23505") {
             return {
                success: false,
                message: "Category with this slug already exists",
                data: null,
                error: { code: "CONFLICT" },
            };
        }
        return { 
            success: false, 
            message: "Internal Server Error", 
            data: null, 
            error: { code: "INTERNAL_ERROR" } 
        };
    }
}

export async function getCategoryById(id: number): Promise<ApiResponse<getSingleCategoryDTO>> {
    try {
        const categoryData = await db.query.categories.findFirst({
            where: eq(categories.id, id),
            columns: {
                id: true,
                name: true,
                slug: true,
                description: true
            },
            with: {
                products: {
                    where: eq(products.isActive, true), // Only show active products
                    orderBy: [desc(products.createdAt)], // Newest products first
                    columns: {
                        id: true,
                        title: true,
                        slug: true,
                        price: true,
                        stock: true
                    },
                    with: {
                        images: {
                            columns: { url: true, altText: true, isPrimary: true },
                            // Optimize: put primary image first
                            orderBy: desc(productImages.isPrimary),
                            limit: 1,
                        },
                    },
                }
            }
        })
        if (!categoryData) {
            return {
                success: false,
                message: "Category not found",
                data: null,
                error: { code: "NOT_FOUND" }
            };
        }
        return {
            success: true,
            message: "Category fetched successfully",
            data: categoryData,
        };
    } catch (error) {
        console.error("getCategoryById Error:", error);
        return { 
            success: false, 
            message: "Internal Server Error", 
            data: null, 
            error: { code: "INTERNAL_ERROR", details: error } 
        };
    }
}

export async function updateCategory(
    categoryId: number,
    userId: string,
    data: UpdateCategoryBodySchema
): Promise<ApiResponse<UpdateCategoryDTO>>{
    try {
        console.log("DATA FOR UPDATE: ", data)
        const {name, description, parentId} = data;

        // Admin Authorization
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        });
        // In future we use this
        // if (!user || user.role !== 'admin') {
        //     return {
        //         success: false,
        //         message: "Unauthorized: Only admins can update categories",
        //         data: null,
        //         error: { code: "FORBIDDEN" }
        //     };
        // }
        // this is alternative method
        if(!user) {
            return {
                success: false,
                message: "Unauthorized: Only admins can update categories",
                data: null,
                error: { code: "FORBIDDEN" }
            };
        }
        // ---2. Check if category exists ---
        const currentCategory = await db.query.categories.findFirst({
            where: eq(categories.id, categoryId),
        });
        if(!currentCategory) {
            return {
                success: false,
                message: "Category not found",
                data: null,
                error: { code: "NOT_FOUND" }
            }
        }
        // --- 3. Prevent Circular Dependency ---
        // Category cannot be its own parent
        if(parentId && parentId === categoryId) {
            return {
                success: false,
                message: "Category cannot be its own parent",
                data: null,
                error: { code: "BAD_REQUEST" }
            }
        }
        // --- 4. Slug Logic (Conditional) ---
        let newSlug = currentCategory.slug;
        // only update slug if name has changed
        if(name && name !== currentCategory.name) {
            newSlug = slugify(name, { lower: true, strict: true });
            // Check uniqueness (Exclude current category ID)
            const slugExists = await db.query.categories.findFirst({
                where: and(
                    eq(categories.slug, newSlug),
                    ne(categories.id, categoryId)
                )
            });
            if (slugExists) {
                newSlug += `-${nanoid(4)}`;
            }
        }
        // --- 5. Validate Parent ID Existence (If changing) ---
        if(parentId && parentId !== currentCategory.parentId) {
            const parentExists = await db.query.categories.findFirst({
                where: eq(categories.id, parentId),
                columns: { id: true }
            });
            if (!parentExists) {
                return {
                    success: false,
                    message: "Parent category not found",
                    data: null,
                    error: { code: "NOT_FOUND" }
                };
            }
        }
        // --- 6. Perform Update ---
        const [updatedCategory] = await db.update(categories)
            .set({
                name: name || currentCategory.name,
                slug: newSlug,
                description: description !== undefined ? description : currentCategory.description, // Handle empty string removal if needed
                parentId: parentId !== undefined ? parentId : currentCategory.parentId,
                updatedAt: new Date(), // Explicitly update timestamp
            })
            .where(eq(categories.id, categoryId))
            .returning({
                id: categories.id,
                name: categories.name,
                slug: categories.slug,
                description: categories.description,
                parentId: categories.parentId,
                updatedAt: categories.updatedAt
            });

        return {
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        };
    } catch (error: any) {
         console.error("updateCategory Error:", error);
        
        // Handle unexpected constraints
        if (error.code === "23505") { // Unique violation
             return {
                success: false,
                message: "Category name/slug already exists",
                data: null,
                error: { code: "CONFLICT" }
            };
        }

        return { 
            success: false, 
            message: "Internal Server Error", 
            data: null, 
            error: { code: "INTERNAL_ERROR", details: error } 
        };
    }
}