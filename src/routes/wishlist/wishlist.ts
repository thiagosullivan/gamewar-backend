import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authenticate } from "../../middleware/auth.js";
import { productTable, wishlistTable } from "../../db/schema.js";
import { success } from "zod";

const wishlistRouter = Router();

// Middleware
wishlistRouter.use(authenticate);

// GET /api/wishlist - get wishlist
wishlistRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const wishlist = await db.query.wishlistTable.findMany({
      where: eq(wishlistTable.userId, userId),
      with: {
        product: {
          with: {
            category: true,
            variants: {
              columns: {
                id: true,
                name: true,
                color: true,
                priceInCents: true,
                imageUrl: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [desc(wishlistTable.createdAt)],
    });

    const formattedWishlist = wishlist.map((item) => {
      const prices = item.product.variants.map((v) => v.priceInCents);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        id: item.id,
        addedAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          brand: item.product.brand,
          description: item.product.description,
          category: item.product.category,
          priceRange: {
            min: minPrice,
            max: maxPrice,
          },
          variantCount: item.product.variants.length,
          image: item.product.variants[0]?.imageUrl || null,
          variants: item.product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            color: v.color,
            priceInCents: v.priceInCents,
            imageUrl: v.imageUrl,
            slug: v.slug,
          })),
        },
      };
    });

    res.json({
      success: true,
      data: formattedWishlist,
      count: formattedWishlist.length,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar lista de desejos",
    });
  }
});

// POST /api/wishlist - add item to wishlist
wishlistRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    const product = await db.query.productTable.findFirst({
      where: eq(productTable.id, productId),
      columns: {
        id: true,
        name: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    const existingItem = await db.query.wishlistTable.findFirst({
      where: and(
        eq(wishlistTable.userId, userId),
        eq(wishlistTable.productId, productId),
      ),
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: "Produto já está na sua lista de desejos",
      });
    }

    const [newItem] = await db
      .insert(wishlistTable)
      .values({
        userId,
        productId,
      })
      .returning();

    if (!newItem) {
      return res.status(404).json({
        success: false,
        error: "Erro no novo item",
      });
    }

    const addedItem = await db.query.wishlistTable.findFirst({
      where: eq(wishlistTable.id, newItem.id),
      with: {
        product: {
          with: {
            category: true,
            variants: {
              columns: {
                id: true,
                name: true,
                color: true,
                priceInCents: true,
                imageUrl: true,
              },
              limit: 1,
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Produto adicionado à lista de desejos",
      data: {
        id: addedItem?.id,
        productId: addedItem?.product.id,
        productName: addedItem?.product.name,
        productImage: addedItem?.product.variants[0]?.imageUrl || null,
        addedAt: addedItem?.createdAt,
      },
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar à lista de desejos",
    });
  }
});

// DELETE /api/wishlist/:productId - Delete item on wishlist
wishlistRouter.delete("/:productId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "ID do produto é obrigatório",
      });
    }

    const existingItem = await db.query.wishlistTable.findFirst({
      where: and(
        eq(wishlistTable.userId, userId),
        eq(wishlistTable.productId, productId),
      ),
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado na sua lista de desejos",
      });
    }

    await db
      .delete(wishlistTable)
      .where(
        and(
          eq(wishlistTable.userId, userId),
          eq(wishlistTable.productId, productId),
        ),
      );

    res.json({
      success: true,
      message: "Produto removido da lista de desejos",
      data: {
        productId,
      },
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover da lista de desejos",
    });
  }
});

// DELETE /api/wishlist - clean all wishlist
wishlistRouter.delete("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    await db.delete(wishlistTable).where(eq(wishlistTable.userId, userId));

    res.json({
      success: true,
      message: "Lista de desejos limpa com sucesso",
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao limpar lista de desejos",
    });
  }
});

export default wishlistRouter;
