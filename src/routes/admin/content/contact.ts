import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { contactInfoTable } from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";

const adminContactRouter = express.Router();

// middleware
adminContactRouter.use(authenticate);
adminContactRouter.use(authorize("admin"));

// GET /api/admin/content/contact - Get all infos
adminContactRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [contactInfo] = await db.select().from(contactInfoTable).limit(1);

    res.json({
      success: true,
      data: contactInfo || {},
    });
  } catch (error) {
    console.error("Admin get contact error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter informações de contato",
    });
  }
});

// PUT /api/admin/content/contact - Update/Create infos
adminContactRouter.put("/", async (req: Request, res: Response) => {
  try {
    const updateData = req.body;

    // verify if already exists
    const [existing] = await db.select().from(contactInfoTable).limit(1);

    let result;

    if (existing) {
      // update
      [result] = await db
        .update(contactInfoTable)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .returning();
    } else {
      // Create
      [result] = await db
        .insert(contactInfoTable)
        .values({
          ...updateData,
          updatedAt: new Date(),
        })
        .returning();
    }

    res.json({
      success: true,
      message: "Informações de contato atualizadas",
      data: result,
    });
  } catch (error: any) {
    console.error("Update contact error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar informações de contato",
    });
  }
});

export default adminContactRouter;
