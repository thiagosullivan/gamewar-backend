import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userTable = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  phone: text("phone"),
  role: text("role", { enum: ["user", "admin", "moderator"] })
    .default("user")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const addressTable = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),

    // Dados do endereço
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: text("zip_code").notNull(),
    country: text("country").default("Brasil").notNull(),

    // Tipo de endereço
    type: text("type", { enum: ["home", "work", "other"] })
      .default("home")
      .notNull(),

    // Padrão (endereço principal)
    isDefault: boolean("is_default").default(false).notNull(),

    // Metadados
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Índices NO MESMO PADRÃO das outras tabelas
    index("address_user_id_idx").on(table.userId),
    index("address_default_idx").on(table.isDefault),
  ],
);

export const userRelations = relations(userTable, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  addresses: many(addressTable),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(userTable, {
    fields: [session.userId],
    references: [userTable.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(userTable, {
    fields: [account.userId],
    references: [userTable.id],
  }),
}));

export const addressRelations = relations(addressTable, ({ one }) => ({
  user: one(userTable, {
    fields: [addressTable.userId],
    references: [userTable.id],
  }),
}));

export const categoryTable = pgTable("category", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categoryRelations = relations(categoryTable, (params) => {
  return {
    products: params.many(productTable),
  };
});

export const productTable = pgTable("product", {
  id: uuid().primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categoryTable.id, { onDelete: "set null" }),
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productRelations = relations(productTable, ({ one, many }) => {
  return {
    products: one(categoryTable, {
      fields: [productTable.categoryId],
      references: [categoryTable.id],
    }),
    variants: many(productVariantTable),
  };
});

export const productVariantTable = pgTable("product_variant", {
  id: uuid().primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "set null" }),
  name: text().notNull(),
  slug: text().notNull().unique(),
  color: text().notNull(),
  priceInCents: integer("price_in_cents").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productVariantRelations = relations(
  productVariantTable,
  (params) => {
    return {
      products: params.one(productTable, {
        fields: [productVariantTable.productId],
        references: [productTable.id],
      }),
    };
  },
);

// Enum para status do pedido
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

// Enum para método de pagamento
export const paymentMethodEnum = pgEnum("payment_method", [
  "credit_card",
  "debit_card",
  "pix",
  "boleto",
  "cash",
]);

export const orderTable = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    addressId: uuid("address_id").references(() => addressTable.id, {
      onDelete: "set null",
    }),

    // Informações do pedido
    orderNumber: text("order_number").notNull().unique(),
    status: orderStatusEnum("status").default("pending").notNull(),

    // Informações de pagamento
    paymentMethod: paymentMethodEnum("payment_method"),
    paymentStatus: text("payment_status", {
      enum: ["pending", "paid", "failed", "refunded"],
    })
      .default("pending")
      .notNull(),
    transactionId: text("transaction_id"),

    // Valores monetários
    subtotal: integer("subtotal").notNull(), // em centavos
    shipping: integer("shipping").default(0).notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(), // em centavos

    // Informações adicionais
    notes: text("notes"),
    trackingCode: text("tracking_code"),
    estimatedDelivery: timestamp("estimated_delivery"),

    // Metadados
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("order_user_id_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_created_at_idx").on(table.createdAt),
  ],
);

// Tabela de itens do pedido
export const orderItemTable = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orderTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => productTable.id, {
      onDelete: "set null",
    }),
    productVariantId: uuid("product_variant_id").references(
      () => productVariantTable.id,
      { onDelete: "set null" },
    ),

    // Informações do produto no momento da compra (snapshot)
    productName: text("product_name").notNull(),
    productImage: text("product_image"),
    variantName: text("variant_name"),
    color: text("color"),

    // Quantidade e preço
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(), // em centavos
    totalPrice: integer("total_price").notNull(), // em centavos

    // Metadados
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_item_order_id_idx").on(table.orderId),
    index("order_item_product_id_idx").on(table.productId),
  ],
);

export const orderRelations = relations(orderTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [orderTable.userId],
    references: [userTable.id],
  }),
  address: one(addressTable, {
    fields: [orderTable.addressId],
    references: [addressTable.id],
  }),
  items: many(orderItemTable),
}));

export const orderItemRelations = relations(orderItemTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [orderItemTable.orderId],
    references: [orderTable.id],
  }),
  product: one(productTable, {
    fields: [orderItemTable.productId],
    references: [productTable.id],
  }),
  variant: one(productVariantTable, {
    fields: [orderItemTable.productVariantId],
    references: [productVariantTable.id],
  }),
}));

export const carouselTable = pgTable("carousel", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  order: integer("order").notNull(),
  title: text("title"),
  description: text("description"),
  link: text("link"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bannerTable = pgTable("banner", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  link: text("link"),
  position: text("position", {
    enum: ["home-top", "home-middle", "sidebar", "bottom"],
  }).default("home-top"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const contactInfoTable = pgTable("contact_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  twitter: text("twitter"),
  address: text("address"),
  businessHours: text("business_hours"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
