import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../../lib/auth.js";

const authRouter = express.Router();

// 1. Middleware para logging
authRouter.use((req, res, next) => {
  console.log(`🔐 Auth: ${req.method} ${req.path}`);
  next();
});

// 2. Todas as rotas do Better Auth
authRouter.all("*", toNodeHandler(auth));

export default authRouter;
