import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";

const authRouter = express.Router();

authRouter.all("*", toNodeHandler(auth));

authRouter.get("/test", (req, res) => {
  res.json({ message: "Auth router is working" });
});

export default authRouter;
