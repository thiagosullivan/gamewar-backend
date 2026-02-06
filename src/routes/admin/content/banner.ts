import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { bannerTable } from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { eq, and } from "drizzle-orm";

const adminBannerRouter = express.Router();

// middleware
adminBannerRouter.use(authenticate);
adminBannerRouter.use(authorize("admin"));

// GET /api/admin/content/banners - Get all banners
adminBannerRouter.get("/", async (req: Request, res: Response) => {
  try {
    const allBanners = await db
      .select()
      .from(bannerTable)
      .orderBy(bannerTable.position, bannerTable.createdAt);

    res.json({
      success: true,
      data: allBanners,
    });
  } catch (error) {
    console.error("Admin get banners error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter banners",
    });
  }
});

// POST /api/admin/content/banners - Create new banner
adminBannerRouter.post("/", async (req: Request, res: Response) => {
  try {
    const {
      imageUrl,
      title,
      link,
      position = "home-top",
      active = true,
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "imageUrl é obrigatória",
      });
    }

    const [newBanner] = await db
      .insert(bannerTable)
      .values({
        imageUrl,
        title: title || null,
        link: link || null,
        position,
        active,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Banner criado com sucesso",
      data: newBanner,
    });
  } catch (error: any) {
    console.error("Create banner error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar banner",
    });
  }
});

// PUT /api/admin/content/banners/:id - Update banner
adminBannerRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(404).json({
        success: false,
        error: "Banner não encontrado",
      });
    }

    const [updatedBanner] = await db
      .update(bannerTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(bannerTable.id, id))
      .returning();

    if (!updatedBanner) {
      return res.status(404).json({
        success: false,
        error: "Banner não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Banner atualizado com sucesso",
      data: updatedBanner,
    });
  } catch (error: any) {
    console.error("Update banner error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar banner",
    });
  }
});

// DELETE /api/admin/content/banners/:id - Delete banner
adminBannerRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(404).json({
        success: false,
        error: "Banner não encontrado",
      });
    }

    const [deletedBanner] = await db
      .delete(bannerTable)
      .where(eq(bannerTable.id, id))
      .returning();

    if (!deletedBanner) {
      return res.status(404).json({
        success: false,
        error: "Banner não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Banner removido com sucesso",
    });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover banner",
    });
  }
});

export default adminBannerRouter;
