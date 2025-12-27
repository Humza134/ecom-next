import { 
   pgTable,
   varchar, 
   timestamp, 
   boolean, 
   pgEnum, 
   index, 
   serial, 
   text, 
   integer, 
   numeric 
  } from 'drizzle-orm/pg-core';
  import { relations } from 'drizzle-orm';


// Enum for roles
export const roleEnum = pgEnum('role', ['user', 'admin']);

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk ID
  email: varchar('email', { length: 255 }).unique().notNull(),
  fullName: varchar('name', { length: 255 }),
  role: roleEnum('role').default('user').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index("users_email_idx").on(t.email),
]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"), // Removed explicit reference function for cleaner typescript inference here, relation handles logic
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    // Self-reference foreign key handled at DB level
    index("categories_parent_idx").on(t.parentId)
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  // Note: numeric returns a string in JS to preserve precision. Handle with care on frontend.
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("product_slug_idx").on(t.slug),
  index("product_category_idx").on(t.categoryId)
]);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: varchar("url", { length: 500 }).notNull(),
  altText: varchar("alt_text", { length: 255 }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONS (Crucial for easy querying) ---

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_hierarchy"
  }),
  children: many(categories, { relationName: "category_hierarchy" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));


export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductCategory = typeof categories.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;