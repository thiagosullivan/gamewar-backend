import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Middlewares de segurança PRIMEIRO
app.use(compression());

// 2. CORS
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

// 3. Helmet (CSP relaxado para desenvolvimento)
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

// 4. Log de requisições (opcional)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 5. BETTER AUTH - ANTES do express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// 6. AGORA SIM - express.json() DEPOIS do Better Auth
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 7. Outras rotas
app.get("/test-login", (req, res) => {
  res.sendFile(path.join(__dirname, "../test-login.html"));
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Ecommerce API is running",
    timestamp: new Date().toISOString(),
  });
});

// Teste o endpoint /ok do Better Auth
app.get("/api/auth/ok", (req, res) => {
  res.json({ ok: true });
});

// 8. 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🧪 Test page: http://localhost:3000/test-login`);
});
