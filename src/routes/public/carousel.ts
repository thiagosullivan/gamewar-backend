import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { carouselTable } from "../../db/schema.js";
import { eq, asc } from "drizzle-orm";

const publicCarouselRouter = express.Router();

// GET /api/content/carousel - Get Carousel
publicCarouselRouter.get("/", async (req: Request, res: Response) => {
  try {
    const carouselItems = await db
      .select({
        id: carouselTable.id,
        imageUrl: carouselTable.imageUrl,
        title: carouselTable.title,
        description: carouselTable.description,
        link: carouselTable.link,
        order: carouselTable.order,
      })
      .from(carouselTable)
      .where(eq(carouselTable.active, true))
      .orderBy(asc(carouselTable.order));

    res.json({
      success: true,
      data: carouselItems,
      count: carouselItems.length,
    });
  } catch (error) {
    console.error("Get carousel error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter carousel",
    });
  }
});

export default publicCarouselRouter;
