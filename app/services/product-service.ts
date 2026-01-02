import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sql, eq, and, desc, asc, notInArray, SQL,inArray  } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { products, productImages, categories } from "@/lib/db/schema/schemas";
import { ApiResponse } from "@/types/api";
import { ProductCreateDTO, ProductDTO, getSingleProductDTO } from "@/types/products";
import { querySchema, productSchema, paramsProductIdSchema, ProductUpdateInput, QuerySchema, ProductFormValues } from "../validations/productsZodSchema";

export async function getProducts (params: QuerySchema):Promise<ApiResponse<ProductDTO[]>> {
    try {
        
        const {page, limit, category, sort} = params;
        const offset = (page - 1) * limit;

        const whereConditions: SQL[] = [eq(products.isActive, true)];
        // Filter by category slug if provided
        if(category){
        // We need to verify category exists/filter by it. 
        // For simplified relational query, we often filter ID, but slug is passed in URLs.
        // Drizzle relational queries allow filtering on joined tables in some drivers, 
        // but standard approach is filtering relations or pre-fetching.
        // To keep it performant:
            
            // this is 2 queries, 1 for the category, 1 for the products
            // const cat = await db.query.categories.findFirst({
            //     where: eq(categories.slug, category),
            //     columns: {id: true}
            // });
            // if(!cat){
            //     return {
            //         success: true,
            //         message: "No product found for this category",
            //         data: [],
            //         meta: { total: 0, page, limit },
            //     }
            // }
            // whereConditions.push(eq(products.categoryId, cat.id));

            // this is 1 query, 1 for the products
            whereConditions.push(
              inArray(
                products.categoryId,
                db.select({ id: categories.id })
                  .from(categories)
                  .where(eq(categories.slug, category))
              )
            );
        }
        // 3. Determine Sort Order
        let orderBy;
        switch (sort) {
        case "price_asc":
            orderBy = asc(products.price);
            break;
        case "price_desc":
            orderBy = desc(products.price);
            break;
        default:
            orderBy = desc(products.createdAt);
        }

        // 4. Execute Queries (Parallelized for Performance)
        // We need two things: The data, and the total count for pagination.
        const [data, totalCountResult] = await Promise.all([
        db.query.products.findMany({
            where: and(...whereConditions),
            limit,
            offset,
            orderBy,
            with: {
            category: { columns: { name: true, slug: true } },
            images: {
                columns: { url: true, altText: true, isPrimary: true, id: true },
                // where: eq(productImages.isPrimary, true),
                orderBy: desc(productImages.isPrimary),
                limit: 1,
                // Optimize: put primary image first
            },
            },
            columns: {
            id: true,
            title: true,
            slug: true,
            price: true,
            stock: true,
            createdAt: true,
            },
        }),
        // Fetch Total Count (Optimized)
        db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(and(...whereConditions)),
        ]);

        const total = Number(totalCountResult[0]?.count || 0);
        const totalPages = Math.ceil(total / limit);

        // const formattedData = data.map(product => ({
        //     ...product,
        //     createdAt: product.createdAt.toISOString(),
        // }));

        return {
        success: true,
        message: "Products fetched successfully",
        data,
        meta: { total, totalPages, page, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
    } catch (error) {
        console.error("getProducts:", error);
        return { 
          success: false, 
          message: "Internal Server Error", 
          data: null,
          error: { code: "INTERNAL_ERROR" }
         };
    }
}

export async function getProductById(id: number): Promise<ApiResponse<getSingleProductDTO>> {
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        category: { columns: { name: true, slug: true } },
        images: {
          columns: { url: true, altText: true, isPrimary: true, id: true },
          // Optimize: put primary image first
          orderBy: desc(productImages.isPrimary),
        },
      },
      columns: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isActive: true,
        price: true,
        stock: true,
      },
    });

    if (!product) {
      return { success: false, message: "Product not found", data: null };
    }

    return { success: true, message: "Product fetched successfully", data: product };
  } catch (error) {
    console.error("getProductById:", error);
    return { success: false, message: "Internal Server Error", data: null };
  }
}

export async function createProduct(params: ProductFormValues, userId: string): Promise<ApiResponse<ProductCreateDTO>> {
  try {
    // --- 3. Deconstruct Params ---
    const { title, description, price, stock, categoryId, images, slug: providedSlug } = params;

    // --- 4. Slug Logic (Unique & URL Friendly) ---
    // If slug is provided, clean it. If not, generate from title.
    let slug = providedSlug
      ? slugify(providedSlug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });
    // Check if slug exists
    const exists = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      columns: { id: true },
    });

    if (exists) slug += `-${nanoid(4)}`;

    // --- 5. Database Transaction (The "Meat") ---
    // We use a transaction so if image insertion fails, the product is not created.
    const newProduct = await db.transaction(async (tx) => {
      // A. Insert Product
      const [product] = await tx
        .insert(products)
        .values({
          title,
          slug,
          description,
          price: String(price), // Numeric expects string
          stock,
          categoryId,
          createdBy: userId, // Foreign Key to Users table
          isActive: true,
        })
        .returning({ id: products.id, title: products.title });  // Return the ID for the next step

      // B. Prepare Image Data
      // Ensure only one image is primary (if frontend sent multiple primaries, fix it)
      const vals = images.map((img, index) => ({
        productId: product.id,
        url: img.url,
        altText: img.altText || title,
        // If user didn't select primary, make the first one primary
        isPrimary: img.isPrimary || (index === 0 && !images.some((i) => i.isPrimary)),
      }));
      // C. Insert Images
      if (vals.length) await tx.insert(productImages).values(vals);

      return product;
    });

    return {
      success: true,
      message: "Product created successfully",
      data: newProduct,
    };

  } catch (err: any) {
    console.error("createProduct:", err);
    // Handle Foreign Key Constraint (e.g., Invalid Category ID or User ID not in DB)
    if (err.code === "23503") {
      return {
        success: false,
        message: "Invalid Foreign Key",
        data: null,
        error: { code: "FOREIGN_KEY_ERROR" },
      };
    }

    return { success: false, message: "Internal Server Error", data: null, error: { code: "INTERNAL_ERROR" } };
  }
}

export async function updateProduct (
  productId: number, 
  userId: string,
  data: ProductUpdateInput 
): Promise<ApiResponse<getSingleProductDTO>> {
  try {
    console.log("DATA FOR UPDATE: ", data)
    // we use a transaction to ensure everything succeeds or fails together
    await db.transaction(async (tx) => {
      // 1. Check Existence & Ownership
      // We lock the row partially or just fetch to validate
      const existingProduct = await tx.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { id: true, createdBy: true, title: true }
      });

      if(!existingProduct) {
        return { success: false, message: "Product not found", data: null };
      }

      if(existingProduct.createdBy !== userId) {
        return { success: false, message: "Unauthorized", data: null };
      }
      // 2. Prepare Product Data (Remove undefined values)
      const { images, ...productFields } = data;

      // Only update products table if there are fields to update
      if(Object.keys(productFields).length > 0) {
        await tx.update(products)
        .set({
          ...productFields,
          price: productFields.price ? String(productFields.price) : undefined, // Convert price to string
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
      }

      // 3. Image Sync Logic (The "Sync" Approach)
      if(images) {
        // console.log("Images: ", images)
        // A. Handle Primary Image Logic
        // Ensure only one image is primary. If none selected, make first one primary.
        const hasPrimary = images.some(img => img.isPrimary);
        if (!hasPrimary && images.length > 0) {
          images[0].isPrimary = true;
        }
        // B. DELETE Missing Images
        // Get IDs of images that are being KEPT/UPDATED
        // if user send new image it has no id
        const keptImageIds = images
          .filter(img => img.id !== undefined)
          .map(img => img.id as number);
          console.log("KeptImages: ", keptImageIds)
          if(keptImageIds.length > 0) {
            // Delete images for this product that are NOT in the kept list
            await tx.delete(productImages)
            .where(and(
              eq(productImages.productId, productId),
              notInArray(productImages.id, keptImageIds)
            ));
          } else {
            // Edge Case: If keptImageIds is empty, it means all existing images were removed 
            // or all are new. We need to be careful. 
            // If the user sent images (but all are new), we delete OLD ones.
            // If the user sent an empty array [], we delete ALL.
             await tx.delete(productImages).where(eq(productImages.productId, productId));
          }
          // C. Loop to UPDATE or INSERT
          for (const img of images) {
            console.log("IMG: ", img)
            if(img.id) {
              // Update Existing
              await tx.update(productImages)
              .set({
                url: img.url,
                altText: img.altText,
                isPrimary: img.isPrimary
              })
              .where(and(
                eq(productImages.id, img.id),
                eq(productImages.productId, productId)
              ));
            } else {
              // Insert New
              await tx.insert(productImages).values({
                productId: productId,
                url: img.url,
                altText: img.altText || existingProduct.title, // Fallback to product title
                isPrimary: img.isPrimary,
              });
            }
          }
      }
    });
    // 4. Return the updated product using your existing GET service
    // This ensures the return format is consistent across the app
    const freshData = await getProductById(productId);
    if (freshData.success) {
        return {
            success: true,
            message: "Product updated successfully", // ✨ Custom Message
            data: freshData.data 
        };
    }
    return freshData;
  } catch (error) {
    console.error("updateProduct Error:", error);
    return { success: false, message: "Internal Server Error", data: null, error: { code: "INTERNAL_ERROR" } };
  }
}