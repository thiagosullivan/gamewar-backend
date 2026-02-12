import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.js";
import {
  cartItemTable,
  cartTable,
  productVariantTable,
} from "../../db/schema.js";

const cartRouter = Router();

// middleware
cartRouter.use(authenticate);

// GET /api/cart - get current user cart
cartRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const existingCart = await db.query.cartTable.findFirst({
      where: eq(cartTable.userId, userId),
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: {
                  with: {
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: (items, { desc }) => [desc(items.createdAt)],
        },
      },
    });

    if (existingCart) {
      let subtotal = 0;
      const formattedItems = existingCart.items.map((item) => {
        const itemTotal = item.variant.priceInCents * item.quantity;
        subtotal += itemTotal;

        return {
          id: item.id,
          quantity: item.quantity,
          addedAt: item.createdAt,
          variant: {
            id: item.variant.id,
            name: item.variant.name,
            color: item.variant.color,
            priceInCents: item.variant.priceInCents,
            imageUrl: item.variant.imageUrl,
            slug: item.variant.slug,
            product: {
              id: item.variant.product.id,
              name: item.variant.product.name,
              slug: item.variant.product.slug,
              brand: item.variant.product.brand,
              category: item.variant.product.category,
            },
          },
          total: itemTotal,
        };
      });

      return res.json({
        success: true,
        data: {
          id: existingCart.id,
          items: formattedItems,
          summary: {
            subtotal,
            shipping: 0,
            discount: 0,
            total: subtotal,
            itemCount: existingCart.items.reduce(
              (acc, item) => acc + item.quantity,
              0,
            ),
          },
          updatedAt: existingCart.updatedAt,
        },
      });
    }

    const [newCart] = await db.insert(cartTable).values({ userId }).returning();

    res.json({
      success: true,
      data: {
        id: newCart?.id,
        items: [],
        summary: {
          subtotal: 0,
          shipping: 0,
          discount: 0,
          total: 0,
          itemCount: 0,
        },
        updatedAt: newCart?.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar carrinho",
    });
  }
});

// POST /api/cart - Add item to cart
cartRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { variantId, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!variantId) {
      return res.status(400).json({
        success: false,
        error: "ID da variante é obrigatório",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser maior que zero",
      });
    }

    const variant = await db.query.productVariantTable.findFirst({
      where: eq(productVariantTable.id, variantId),
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    let cart = await db.query.cartTable.findFirst({
      where: eq(cartTable.userId, userId),
    });

    if (!cart) {
      const [newCart] = await db
        .insert(cartTable)
        .values({ userId })
        .returning();
      cart = newCart;
    }

    if (!cart) {
      return res.status(500).json({
        success: false,
        error: "Erro ao criar/recuperar carrinho",
      });
    }

    const existingItem = await db.query.cartItemTable.findFirst({
      where: and(
        eq(cartItemTable.cartId, cart.id),
        eq(cartItemTable.variantId, variantId),
      ),
    });

    let item;
    if (existingItem) {
      [item] = await db
        .update(cartItemTable)
        .set({
          quantity: existingItem.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItemTable.id, existingItem.id))
        .returning();
    } else {
      [item] = await db
        .insert(cartItemTable)
        .values({
          cartId: cart.id,
          variantId,
          quantity,
        })
        .returning();
    }

    if (!item) {
      throw new Error("Erro ao salvar item no carrinho");
    }

    res.status(201).json({
      success: true,
      message: existingItem
        ? "Quantidade atualizada no carrinho"
        : "Produto adicionado ao carrinho",
      data: {
        id: item.id,
        quantity: item.quantity,
        variantId: item.variantId,
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar item ao carrinho",
    });
  }
});

// PUT /api/cart/:itemId - Update item quantity
cartRouter.put("/:itemId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: "ID do item é obrigatório",
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantidade deve ser maior que zero",
      });
    }

    const cart = await db.query.cartTable.findFirst({
      where: eq(cartTable.userId, userId),
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Carrinho não encontrado",
      });
    }

    const item = await db.query.cartItemTable.findFirst({
      where: and(
        eq(cartItemTable.id, itemId),
        eq(cartItemTable.cartId, cart.id),
      ),
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    const [updatedItem] = await db
      .update(cartItemTable)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(eq(cartItemTable.id, itemId))
      .returning();

    if (!updatedItem) {
      throw new Error("Erro ao atualizar item");
    }

    res.json({
      success: true,
      message: "Quantidade atualizada",
      data: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
      },
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar item do carrinho",
    });
  }
});

// DELETE /api/cart/:itemId - Delete item from cart
cartRouter.delete("/:itemId", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: "ID do item é obrigatório",
      });
    }

    const cart = await db.query.cartTable.findFirst({
      where: eq(cartTable.userId, userId),
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Carrinho não encontrado",
      });
    }

    const item = await db.query.cartItemTable.findFirst({
      where: and(
        eq(cartItemTable.id, itemId),
        eq(cartItemTable.cartId, cart.id),
      ),
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item não encontrado no carrinho",
      });
    }

    await db.delete(cartItemTable).where(eq(cartItemTable.id, itemId));

    res.json({
      success: true,
      message: "Item removido do carrinho",
      data: {
        id: itemId,
      },
    });
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover item do carrinho",
    });
  }
});

// DELETE /api/cart - clean cart
cartRouter.delete("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const cart = await db.query.cartTable.findFirst({
      where: eq(cartTable.userId, userId),
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Carrinho não encontrado",
      });
    }

    await db.delete(cartItemTable).where(eq(cartItemTable.cartId, cart.id));

    res.json({
      success: true,
      message: "Carrinho limpo com sucesso",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao limpar carrinho",
    });
  }
});

export default cartRouter;
