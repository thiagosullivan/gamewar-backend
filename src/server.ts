import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import authRouter from "./routes/auth/auth.js";
import userRouter from "./routes/user/user.js";
import addressRouter from "./routes/address/address.js";
import orderRouter from "./routes/orders/orders.js";
// import { toNodeHandler } from "better-auth/node";
// import { auth } from "./lib/auth.js";
// import path from "path";
// import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Middlewares
app.use(compression());

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/orders", orderRouter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ecommerce API is running",
    timestamp: new Date().toISOString(),
  });
});

// app.get("/test-login", (req, res) => {
//   res.sendFile(path.join(__dirname, "../test-login.html"));
// });

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
});
