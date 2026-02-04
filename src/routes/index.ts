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

const router = express.Router();

// Public content routes
router.use("/content/carousel", publicCarouselRouter);
router.use("/content/banners", publicBannerRouter);
router.use("/content/contact", publicContactRouter);

// Authentication routes
router.use("/auth", authRouter);

// Authentication routes (users)
router.use("/user", userRouter);
router.use("/addresses", addressesRouter);
router.use("/orders", ordersRouter);

// Admin routes
router.use("/admin/users", adminUsersRouter);
router.use("/admin/content/carousel", adminCarouselRouter);
router.use("/admin/content/banners", adminBannerRouter);
router.use("/admin/content/contact", adminContactRouter);

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
