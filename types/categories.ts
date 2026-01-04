import { type ProductCategory, type ProductImage, type Product } from "@/lib/db/schema/schemas";


// return types
export interface CategoriesDTO extends Pick<ProductCategory, 'name' | 'slug' | 'id' | 'description'> {
    
}

// 2. Tree Category (with children)
export interface CategoryTreeDTO extends Pick<ProductCategory, 'id' | 'name' | 'slug'> {
    children: {
        id: number;
        name: string;
        slug: string;
        children: {
            id: number;
            name: string;
            slug: string;
        }[];
    }[];
}

export interface CreateCategoryDTO extends Pick<ProductCategory, 'name' | 'id'> {}

export interface getSingleCategoryDTO extends CategoriesDTO {
    products: (Pick<Product, 'id' | 'title' | 'slug' | 'price' | 'stock'> & {
        images: Pick<ProductImage, 'url' | 'altText' | 'isPrimary'>[];
    })[]
}

// DTO for the response after updating
export interface UpdateCategoryDTO extends Pick<ProductCategory, 
'id' | 'name' | 'slug' | 'description' | 'parentId' | 'updatedAt'> {}
