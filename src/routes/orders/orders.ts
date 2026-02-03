import express from "express";
import type { Request, Response } from "express";
import { eq, and, desc, inArray, sum } from "drizzle-orm";
import { randomInt } from "crypto";
import { db } from "../../db/index.js";
import {
  addressTable,
  orderItemTable,
  orderTable,
  productTable,
  productVariantTable,
} from "../../db/schema.js";
import { authenticate } from "../../middleware/auth.js";

const orderRouter = express.Router();

// middleware
orderRouter.use(authenticate);

// Create an unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = randomInt(1000, 9999);
  return `ORD-${timestamp}-${random}`;
};

// POST /api/orders - Create new order
orderRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      addressId,
      paymentMethod,
      items,
      notes,
      shipping = 1000, // default R$10,00
      discount = 0,
    } = req.body;

    if (
      !addressId ||
      !paymentMethod ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Endereço, método de pagamento e itens são obrigatórios",
      });
    }

    if (typeof shipping !== "number" || shipping < 0) {
      return res.status(400).json({
        success: false,
        error: "Valor de frete inválido",
      });
    }

    if (typeof discount !== "number" || discount < 0) {
      return res.status(400).json({
        success: false,
        error: "Valor de desconto inválido",
      });
    }

    // Verify if user own the address
    const [address] = await db
      .select()
      .from(addressTable)
      .where(
        and(eq(addressTable.id, addressId), eq(addressTable.userId, userId)),
      )
      .limit(1);

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Endereço não encontrado ou não pertence ao usuário",
      });
    }

    let subtotal = 0;
    const validatedItems: Array<{
      productId: string;
      productVariantId: string;
      productName: string;
      productImage: string | null;
      variantName: string;
      color: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of items) {
      if (!item.productVariantId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Item inválido: produto e quantidade são obrigatórios",
        });
      }

      const [productVariant] = await db
        .select({
          variant: productVariantTable,
          product: productTable,
        })
        .from(productVariantTable)
        .innerJoin(
          productTable,
          eq(productVariantTable.productId, productTable.id),
        )
        .where(eq(productVariantTable.id, item.productVariantId))
        .limit(1);

      if (!productVariant) {
        return res.status(400).json({
          success: false,
          error: `Produto/variante não encontrado: ${item.productVariantId}`,
        });
      }

      const unitPrice = productVariant.variant.priceInCents;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: productVariant.product.id,
        productVariantId: productVariant.variant.id,
        productName: productVariant.product.name,
        productImage: productVariant.variant.imageUrl,
        variantName: productVariant.variant.name,
        color: productVariant.variant.color,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    const maxDiscount = subtotal + shipping;
    const finalDiscount = discount > maxDiscount ? maxDiscount : discount;

    const total = subtotal + shipping - finalDiscount;

    // Criar pedido
    const [newOrder] = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orderTable)
        .values({
          userId,
          addressId,
          orderNumber: generateOrderNumber(),
          paymentMethod,
          subtotal,
          shipping,
          discount: finalDiscount,
          total,
          notes: notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!order) {
        throw new Error("Falha ao criar pedido");
      }

      const orderItems = validatedItems.map((item) => ({
        ...item,
        orderId: order.id,
        createdAt: new Date(),
      }));

      if (orderItems.length > 0) {
        await tx.insert(orderItemTable).values(orderItems);
      }

      return [order];
    });

    if (!newOrder) {
      throw new Error("Pedido não foi criado");
    }

    res.status(201).json({
      success: true,
      message: "Pedido criado com sucesso",
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        subtotal: newOrder.subtotal,
        shipping: newOrder.shipping,
        discount: newOrder.discount,
        total: newOrder.total,
        createdAt: newOrder.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar pedido",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/orders - Get orders by user
orderRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const whereConditions = [eq(orderTable.userId, userId)];

    if (status && typeof status === "string") {
      const validStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ];
    }

    if (status && typeof status === "string") {
      whereConditions.push(
        eq(
          orderTable.status,
          status as
            | "pending"
            | "processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded",
        ),
      );
    }

    const orders = await db
      .select({
        id: orderTable.id,
        orderNumber: orderTable.orderNumber,
        status: orderTable.status,
        total: orderTable.total,
        paymentMethod: orderTable.paymentMethod,
        paymentStatus: orderTable.paymentStatus,
        createdAt: orderTable.createdAt,
        itemCount: db.$count(
          orderItemTable,
          eq(orderItemTable.orderId, orderTable.id),
        ),
      })
      .from(orderTable)
      .where(and(...whereConditions))
      .orderBy(desc(orderTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const [countResult] = await db
      .select({ count: db.$count(orderTable) })
      .from(orderTable)
      .where(and(...whereConditions));

    res.json({
      success: true,
      orders,
      pagination: {
        total: countResult?.count || 0,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error: any) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar pedidos",
    });
  }
});

// GET /api/orders/:id - Get order details
orderRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(401).json({ error: "ID da order não encontrado" });
    }

    const [order] = await db
      .select()
      .from(orderTable)
      .where(and(eq(orderTable.id, orderId), eq(orderTable.userId, userId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    const items = await db
      .select()
      .from(orderItemTable)
      .where(eq(orderItemTable.orderId, orderId))
      .orderBy(orderItemTable.createdAt);

    const [address] = await db
      .select()
      .from(addressTable)
      .where(eq(addressTable.id, order.addressId!))
      .limit(1);

    res.json({
      success: true,
      order: {
        ...order,
        address: address || null,
        items,
      },
    });
  } catch (error: any) {
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter detalhes do pedido",
    });
  }
});

// PATCH /api/orders/:id/cancel - Cancel Order
orderRouter.patch("/:id/cancel", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(401).json({ error: "ID da order não encontrado" });
    }

    const [order] = await db
      .select()
      .from(orderTable)
      .where(and(eq(orderTable.id, orderId), eq(orderTable.userId, userId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    if (!["pending", "processing"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Não é possível cancelar o pedido neste status",
      });
    }

    const [updatedOrder] = await db
      .update(orderTable)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning();

    res.json({
      success: true,
      message: "Pedido cancelado com sucesso",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao cancelar pedido",
    });
  }
});

export default orderRouter;
