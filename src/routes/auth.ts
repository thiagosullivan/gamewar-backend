import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";

const authRouter = express.Router();

// Better Auth handler - captura todas as rotas do Better Auth
authRouter.all("/*", toNodeHandler(auth));

export default authRouter;
