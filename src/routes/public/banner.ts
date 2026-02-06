import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { bannerTable } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const publicBannerRouter = express.Router();

// GET /api/content/banners - Get banners
publicBannerRouter.get("/", async (req: Request, res: Response) => {
  try {
    const banners = await db
      .select({
        id: bannerTable.id,
        imageUrl: bannerTable.imageUrl,
        title: bannerTable.title,
        link: bannerTable.link,
        position: bannerTable.position,
      })
      .from(bannerTable)
      .where(eq(bannerTable.active, true));

    res.json({
      success: true,
      data: banners,
      count: banners.length,
    });
  } catch (error) {
    console.error("Get banners error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter banners",
    });
  }
});

// GET /api/content/banners/:position - Get banner by position
publicBannerRouter.get("/:position", async (req: Request, res: Response) => {
  try {
    const { position } = req.params;

    if (!position) {
      return res.status(400).json({
        success: false,
        error: "Posição é obrigatória",
      });
    }

    const validPositions = ["home-top", "home-middle", "sidebar", "bottom"];

    if (!validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        error: `Posição inválida. Use: ${validPositions.join(", ")}`,
      });
    }

    const typedPosition = position as
      | "home-top"
      | "home-middle"
      | "sidebar"
      | "bottom";

    const banners = await db
      .select({
        id: bannerTable.id,
        imageUrl: bannerTable.imageUrl,
        title: bannerTable.title,
        link: bannerTable.link,
      })
      .from(bannerTable)
      .where(
        and(
          eq(bannerTable.position, typedPosition),
          eq(bannerTable.active, true),
        ),
      );

    res.json({
      success: true,
      data: banners,
      count: banners.length,
    });
  } catch (error) {
    console.error("Get banners by position error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter banners",
    });
  }
});

export default publicBannerRouter;
