import { type Product, type ProductCategory, type ProductImage } from "@/lib/db/schema/schemas";

export interface ProductImageDTO {
    url: string;
    altText: string | null;
    isPrimary: boolean;
    id: number
};

// return types
export interface ProductCategoryDTO {
    name: string;
    slug: string;
};

export interface ProductDTO extends Omit<Product, 'categoryId' | 'createdBy' | 'isActive' | 'updatedAt' | 'description'> {
    category: ProductCategoryDTO;
    images: ProductImageDTO[];
}

export interface ProductCreateDTO {
    id: number;
    title: string;
}

export interface getSingleProductDTO extends Omit<Product, 'categoryId' | 'createdBy' | 'updatedAt' | 'createdAt'> {
    // category select required fields
    category: Pick<ProductCategory, 'name' | 'slug'>;
    // images select required fields use omit to remove unneeded fields
    images: ProductImageDTO[];
}