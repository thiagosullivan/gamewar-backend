import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { carouselTable } from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { eq, asc, inArray } from "drizzle-orm";

const adminCarouselRouter = express.Router();

// middleware / need admin role
adminCarouselRouter.use(authenticate);
adminCarouselRouter.use(authorize("admin"));

// GET /api/admin/content/carousel - Get all carousel items
adminCarouselRouter.get("/", async (req: Request, res: Response) => {
  try {
    const allItems = await db
      .select()
      .from(carouselTable)
      .orderBy(asc(carouselTable.order));

    res.json({
      success: true,
      data: allItems,
    });
  } catch (error) {
    console.error("Admin get carousel error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter carousel",
    });
  }
});

// POST /api/admin/content/carousel - Add new item
adminCarouselRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { imageUrl, title, description, link, active = true } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "imageUrl é obrigatória",
      });
    }

    const existingItems = await db
      .select({ id: carouselTable.id })
      .from(carouselTable);

    if (existingItems.length >= 4) {
      return res.status(400).json({
        success: false,
        error: "Máximo de 4 itens no carousel atingido",
      });
    }

    const newOrder = existingItems.length + 1;

    const [newItem] = await db
      .insert(carouselTable)
      .values({
        imageUrl,
        title: title || null,
        description: description || null,
        link: link || null,
        order: newOrder,
        active,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Item adicionado ao carousel",
      data: newItem,
    });
  } catch (error: any) {
    console.error("Add carousel item error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar item",
    });
  }
});

// PUT /api/admin/content/carousel/:id - Update item
adminCarouselRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(404).json({
        success: false,
        error: "Item do carousel não encontrado",
      });
    }

    const [updatedItem] = await db
      .update(carouselTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(carouselTable.id, id))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: "Item do carousel não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Item atualizado com sucesso",
      data: updatedItem,
    });
  } catch (error: any) {
    console.error("Update carousel item error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar item",
    });
  }
});

// PUT /api/admin/content/carousel/reorder - Reorder items
adminCarouselRouter.put("/reorder", async (req: Request, res: Response) => {
  try {
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "itemIds deve ser um array não vazio",
      });
    }

    // Verifica se todos os IDs existem
    const existingItems = await db
      .select({ id: carouselTable.id })
      .from(carouselTable)
      .where(inArray(carouselTable.id, itemIds));

    if (existingItems.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        error: "Alguns IDs não foram encontrados",
      });
    }

    // Atualiza ordem
    await db.transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx
          .update(carouselTable)
          .set({
            order: i + 1,
            updatedAt: new Date(),
          })
          .where(eq(carouselTable.id, itemIds[i]));
      }
    });

    res.json({
      success: true,
      message: "Carousel reordenado com sucesso",
    });
  } catch (error) {
    console.error("Reorder carousel error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao reordenar carousel",
    });
  }
});

// PATCH /api/admin/content/carousel/:id/toggle - Activate/deactivate
adminCarouselRouter.patch(
  "/:id/toggle",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "Item do carousel não encontrado",
        });
      }

      const [item] = await db
        .select({ active: carouselTable.active })
        .from(carouselTable)
        .where(eq(carouselTable.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: "Item não encontrado",
        });
      }

      const [updatedItem] = await db
        .update(carouselTable)
        .set({
          active: !item.active,
          updatedAt: new Date(),
        })
        .where(eq(carouselTable.id, id))
        .returning();

      if (!updatedItem) {
        return res.status(500).json({
          success: false,
          error: "Erro ao atualizar item",
        });
      }

      res.json({
        success: true,
        message: `Item ${updatedItem.active ? "ativado" : "desativado"}`,
        data: updatedItem,
      });
    } catch (error) {
      console.error("Toggle carousel item error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao alterar status",
      });
    }
  },
);

// DELETE /api/admin/content/carousel/:id - Delete item
adminCarouselRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(404).json({
        success: false,
        error: "Id do carousel não encontrado",
      });
    }

    const [itemToDelete] = await db
      .select({ id: carouselTable.id })
      .from(carouselTable)
      .where(eq(carouselTable.id, id));

    if (!itemToDelete) {
      return res.status(404).json({
        success: false,
        error: "Item do carousel não encontrado",
      });
    }

    // Usa transação para atomicidade
    await db.transaction(async (tx) => {
      // Deleta
      await tx.delete(carouselTable).where(eq(carouselTable.id, id));

      const items = await tx
        .select()
        .from(carouselTable)
        .orderBy(asc(carouselTable.order));

      const updatePromises = items.map((item, index) =>
        tx
          .update(carouselTable)
          .set({ order: index + 1 })
          .where(eq(carouselTable.id, item.id)),
      );

      await Promise.all(updatePromises);
    });

    res.json({
      success: true,
      message: "Item removido com sucesso",
    });
  } catch (error) {
    console.error("Delete carousel item error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover item",
    });
  }
});

export default adminCarouselRouter;
