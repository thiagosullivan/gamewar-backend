import express from "express";

// Public routes
import publicCarouselRouter from "./public/carousel.js";
import publicBannerRouter from "./public/banner.js";
import publicContactRouter from "./public/contact.js";

// Admin routes
import adminCarouselRouter from "./admin/content/carousel.js";
import adminContactRouter from "./admin/content/contact.js";

// Other routes
import adminBannerRouter from "./admin/content/banner.js";
import authRouter from "./auth/auth.js";
import userRouter from "./user/user.js";
import addressesRouter from "./addresses/addresses.js";
import ordersRouter from "./orders/orders.js";
import adminUsersRouter from "./admin/admin.js";
import adminCategoriesRouter from "./admin/categories/index.js";
import adminProductsRouter from "./admin/products/index.js";
import adminVariantsRouter from "./admin/products/variants.js";
import publicProductsRouter from "./public/products.js";
import publicCategoriesRouter from "./public/categories.js";
import cartRouter from "./cart/cart.js";
import adminOrdersRouter from "./admin/orders/index.js";
import adminDashboardRouter from "./admin/dashboard/index.js";

const router = express.Router();

// Public content routes
router.use("/content/carousel", publicCarouselRouter);
router.use("/content/banners", publicBannerRouter);
router.use("/content/contact", publicContactRouter);
router.use("/products", publicProductsRouter);
router.use("/categories", publicCategoriesRouter);

// Authentication routes
router.use("/auth", authRouter);

// Authentication routes (users)
router.use("/user", userRouter);
router.use("/addresses", addressesRouter);
router.use("/orders", ordersRouter);
router.use("/cart", cartRouter);

// Admin routes
router.use("/admin/users", adminUsersRouter);
router.use("/admin/content/carousel", adminCarouselRouter);
router.use("/admin/content/banners", adminBannerRouter);
router.use("/admin/content/contact", adminContactRouter);
router.use("/admin/categories", adminCategoriesRouter);
router.use("/admin/products", adminProductsRouter);
router.use("/admin/products", adminVariantsRouter);
router.use("/admin/orders", adminOrdersRouter);
router.use("/admin/dashboard", adminDashboardRouter);
router.use("/admin/analytics", adminDashboardRouter);

// health route
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ecommerce API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 route
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota da API não encontrada: ${req.originalUrl}`,
  });
});

export default router;
