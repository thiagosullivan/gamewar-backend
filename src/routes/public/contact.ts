import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { contactInfoTable } from "../../db/schema.js";

const publicContactRouter = express.Router();

// GET /api/content/contact - Get all company infos
publicContactRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [contactInfo] = await db.select().from(contactInfoTable).limit(1);

    res.json({
      success: true,
      data: contactInfo || {},
    });
  } catch (error) {
    console.error("Get contact info error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter informações de contato",
    });
  }
});

export default publicContactRouter;
