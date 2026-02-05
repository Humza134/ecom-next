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
    // 🆕 Aggregated Review Data
    rating: number;      // e.g., 4.5
    reviewCount: number; // e.g., 25
}

export interface ProductCreateDTO {
    id: number;
    title: string;
}

// 1. Single Review DTO (Who will see in the list)
export interface ProductReviewDetailDTO {
    id: number;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: {
        id: string;
        fullName: string | null;
    };
}

export interface getSingleProductDTO extends Omit<Product, 'categoryId' | 'createdBy' | 'updatedAt' | 'createdAt'> {
    // category select required fields
    category: Pick<ProductCategory, 'name' | 'slug'>;
    // images select required fields use omit to remove unneeded fields
    images: ProductImageDTO[];
    // 🆕 Aggregated Stats (Header ke liye)
    rating: number;      // e.g., 4.5
    reviewCount: number; // e.g., 120
    
    // 🆕 Latest Reviews (Sirf top 5)
    recentReviews: ProductReviewDetailDTO[];
}