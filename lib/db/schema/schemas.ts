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
   numeric,
   json 
  } from 'drizzle-orm/pg-core';
  import { relations } from 'drizzle-orm';

// Enum is important for type safety
// Enum for roles
export const roleEnum = pgEnum('role', ['user', 'admin']);

// order status enum
export const orderStatusEnum = pgEnum('order_status',
  ["pending", "processing", "shipped", "delivered", "cancelled"]
);
// payment status enum
export const paymentStatusEnum = pgEnum('payment_status', 
  ["pending", "succeeded", "failed", "refunded"]
)


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

// 💼 Cart – represents a user's active cart
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),

  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),

  // if it is true, the cart is active, Make it false after placing the order
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("carts_user_idx").on(t.userId) // Index for faster querying
]);

// 🛍️ CartItems – products inside a cart
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),

  // NOTE: unitPrice has been removed from here so that the user always 
  // gets the latest price from the Products table.
  // unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("cart_item_cart_idx").on(t.cartId),
  index("cart_item_product_idx").on(t.productId),
]);

// Orders Table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  // Total amount (Final confirmed amount)
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  // save shipping address in json format because easy to access city, state, zip, etc.
  shippingAddress: json("shipping_address").notNull(),
  // Example data: { line1: "Street 1", city: "Karachi", zip: "75500" }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("orders_user_idx").on(t.userId),
]);

// Order Item Table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  
  quantity: integer("quantity").notNull().default(1),
  
  // Snapshot Price (Bohat Zaroori)
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("order_items_order_idx").on(t.orderId),
]);

// Payment Table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull(),
  
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default('usd').notNull(),
  
  status: paymentStatusEnum("status").default("pending").notNull(),
  
  // store metadata in json format, sometimes its helpful for debugging
  metadata: json("metadata"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("payments_order_idx").on(t.orderId),
  index("payments_stripe_idx").on(t.stripePaymentIntentId) // for fast webhook lookups
]);

// ⭐ Reviews Table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  
  // Kis user ne review diya
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Kis product ka review hai
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  // Rating usually 1 se 5 hoti hai
  rating: integer("rating").notNull(), 
  
  // User ka comment
  comment: text("comment"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // Fast searching ke liye index
  index("reviews_product_idx").on(t.productId),
  index("reviews_user_idx").on(t.userId),
  // 💡 Constraint: user can only review a product once. (optional but recommended)
  // unique("user_product_review_unique").on(t.userId, t.productId) 
]);

// --- RELATIONS (Crucial for easy querying) ---

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  reviews: many(reviews),
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
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// A cart belongs to one user
export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  cartItems: many(cartItems),
}));

// A cartItem belongs to one cart and one product
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

// orders relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments), // one order has multiple associated payments
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductCategory = typeof categories.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Review = typeof reviews.$inferSelect;