import express from "express";
import type { Request, Response } from "express";
import {
  eq,
  and,
  desc,
  gte,
  lte,
  count,
  sum,
  asc,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  orderTable,
  orderItemTable,
  userTable,
  addressTable,
  productTable,
  productVariantTable,
} from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";

const adminOrdersRouter = express.Router();

// Middleware
adminOrdersRouter.use(authenticate);
adminOrdersRouter.use(authorize("admin"));

// Enums types
type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

// GET /api/admin/orders - Get all orders with filters
adminOrdersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      search,
      limit = 20,
      offset = 0,
      sortBy = "createdAt_desc",
    } = req.query;

    const filters: any[] = [];

    if (status && typeof status === "string") {
      const statusList = status.split(",").map((s) => s.trim());
      const validOrderStatuses: OrderStatus[] = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ];

      const validStatuses = statusList.filter((s) =>
        validOrderStatuses.includes(s as OrderStatus),
      ) as OrderStatus[];

      if (validStatuses.length === 1) {
        filters.push(eq(orderTable.status, validStatuses[0] as OrderStatus));
      } else if (validStatuses.length > 1) {
        filters.push(
          inArray(orderTable.status, validStatuses as OrderStatus[]),
        );
      }
    }

    if (paymentStatus && typeof paymentStatus === "string") {
      const paymentStatusList = paymentStatus.split(",").map((s) => s.trim());
      const validPaymentStatuses: PaymentStatus[] = [
        "pending",
        "paid",
        "failed",
        "refunded",
      ];

      const validStatuses = paymentStatusList.filter((s) =>
        validPaymentStatuses.includes(s as PaymentStatus),
      ) as PaymentStatus[];

      if (validStatuses.length === 1) {
        filters.push(
          eq(orderTable.paymentStatus, validStatuses[0] as PaymentStatus),
        );
      } else if (validStatuses.length > 1) {
        filters.push(
          inArray(orderTable.paymentStatus, validStatuses as PaymentStatus[]),
        );
      }
    }

    // filter by date
    if (startDate && typeof startDate === "string") {
      filters.push(gte(orderTable.createdAt, new Date(startDate)));
    }
    if (endDate && typeof endDate === "string") {
      filters.push(lte(orderTable.createdAt, new Date(endDate)));
    }

    // filter by total value
    if (minTotal && !isNaN(Number(minTotal))) {
      filters.push(gte(orderTable.total, Number(minTotal)));
    }
    if (maxTotal && !isNaN(Number(maxTotal))) {
      filters.push(lte(orderTable.total, Number(maxTotal)));
    }

    // search by order number
    if (search && typeof search === "string") {
      filters.push(sql`${orderTable.orderNumber} ILIKE ${`%${search}%`}`);
    }

    const orders = await db.query.orderTable.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: {
          columns: {
            id: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        items: {
          columns: {
            id: true,
            quantity: true,
          },
        },
      },
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotal: true,
        shipping: true,
        discount: true,
        total: true,
        trackingCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (() => {
        if (sortBy === "total_asc") return asc(orderTable.total);
        if (sortBy === "total_desc") return desc(orderTable.total);
        if (sortBy === "createdAt_asc") return asc(orderTable.createdAt);
        return desc(orderTable.createdAt);
      })(),
      limit: Number(limit),
      offset: Number(offset),
    });

    const countQuery = db.select({ count: count() }).from(orderTable);

    if (filters.length > 0) {
      countQuery.where(and(...filters));
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      trackingCode: order.trackingCode,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user,
      address: order.address,
      itemCount: order.items.length,
    }));

    const currentPage = Math.floor(Number(offset) / Number(limit)) + 1;
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        page: currentPage,
        totalPages,
        hasNext: Number(offset) + Number(limit) < total,
        hasPrev: Number(offset) > 0,
      },
    });
  } catch (error) {
    console.error("Admin get orders error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar pedidos",
    });
  }
});

// GET /api/admin/orders/:id - get order by id
adminOrdersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID do pedido é obrigatório",
      });
    }

    const order = await db.query.orderTable.findFirst({
      where: eq(orderTable.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        address: {
          columns: {
            id: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
          },
        },
        items: {
          columns: {
            id: true,
            productName: true,
            productImage: true,
            variantName: true,
            color: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            createdAt: true,
          },
          with: {
            product: { columns: { id: true } },
            variant: { columns: { id: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Admin get order details error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar detalhes do pedido",
    });
  }
});

// PUT /api/admin/orders/:id/status - Update order
adminOrdersRouter.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingCode, estimatedDelivery, notes } =
      req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID do pedido é obrigatório",
      });
    }

    const existingOrder = await db.query.orderTable.findFirst({
      where: eq(orderTable.id, id),
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    const validOrderStatuses: OrderStatus[] = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    const validPaymentStatuses: PaymentStatus[] = [
      "pending",
      "paid",
      "failed",
      "refunded",
    ];

    if (status && !validOrderStatuses.includes(status as OrderStatus)) {
      return res.status(400).json({
        success: false,
        error: "Status de pedido inválido",
      });
    }

    if (
      paymentStatus &&
      !validPaymentStatuses.includes(paymentStatus as PaymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        error: "Status de pagamento inválido",
      });
    }

    if (
      status === "cancelled" &&
      !["pending", "processing"].includes(existingOrder.status)
    ) {
      return res.status(400).json({
        success: false,
        error: "Não é possível cancelar o pedido neste status",
      });
    }

    if (status === "delivered" && existingOrder.status !== "shipped") {
      return res.status(400).json({
        success: false,
        error: "Pedido precisa ser enviado antes de ser entregue",
      });
    }

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingCode !== undefined)
      updateData.trackingCode = trackingCode || null;
    if (estimatedDelivery)
      updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (notes !== undefined) updateData.notes = notes || null;

    const [updatedOrder] = await db
      .update(orderTable)
      .set(updateData)
      .where(eq(orderTable.id, id))
      .returning();

    res.json({
      success: true,
      message: "Status do pedido atualizado com sucesso",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Admin update order status error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar status do pedido",
    });
  }
});

// GET /api/admin/orders/stats/summary - get summary
adminOrdersRouter.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "12m":
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // general stats
    const [generalStats] = await db
      .select({
        totalOrders: count(),
        totalRevenue: sum(orderTable.total),
        averageOrderValue: sql<number>`AVG(${orderTable.total})`,
      })
      .from(orderTable);

    // orders by status
    const ordersByStatus = await db
      .select({
        status: orderTable.status,
        count: count(),
        total: sum(orderTable.total),
      })
      .from(orderTable)
      .groupBy(orderTable.status)
      .orderBy(orderTable.status);

    // order by payment status
    const ordersByPaymentStatus = await db
      .select({
        paymentStatus: orderTable.paymentStatus,
        count: count(),
        total: sum(orderTable.total),
      })
      .from(orderTable)
      .groupBy(orderTable.paymentStatus)
      .orderBy(orderTable.paymentStatus);

    // recent orders
    const [recentStats] = await db
      .select({
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(gte(orderTable.createdAt, startDate));

    // orders by day
    const ordersByDay = await db
      .select({
        date: sql<string>`DATE(${orderTable.createdAt})`,
        count: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(gte(orderTable.createdAt, startDate))
      .groupBy(sql`DATE(${orderTable.createdAt})`)
      .orderBy(desc(sql`DATE(${orderTable.createdAt})`))
      .limit(30);

    // top products
    const topProducts = await db
      .select({
        productName: orderItemTable.productName,
        variantName: orderItemTable.variantName,
        totalSold: sum(orderItemTable.quantity),
        revenue: sum(orderItemTable.totalPrice),
      })
      .from(orderItemTable)
      .innerJoin(orderTable, eq(orderItemTable.orderId, orderTable.id))
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          eq(orderTable.status, "delivered"),
        ),
      )
      .groupBy(orderItemTable.productName, orderItemTable.variantName)
      .orderBy(desc(sql`SUM(${orderItemTable.quantity})`))
      .limit(10);

    res.json({
      success: true,
      data: {
        period,
        general: {
          totalOrders: Number(generalStats?.totalOrders) || 0,
          totalRevenue: Number(generalStats?.totalRevenue) || 0,
          averageOrderValue: Number(generalStats?.averageOrderValue) || 0,
        },
        recent: {
          orders: Number(recentStats?.orders) || 0,
          revenue: Number(recentStats?.revenue) || 0,
        },
        ordersByStatus,
        ordersByPaymentStatus,
        ordersByDay: ordersByDay.map((day) => ({
          date: day.date,
          count: Number(day.count),
          revenue: Number(day.revenue),
        })),
        topProducts: topProducts.map((product) => ({
          ...product,
          totalSold: Number(product.totalSold),
          revenue: Number(product.revenue),
        })),
      },
    });
  } catch (error) {
    console.error("Admin orders stats error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar estatísticas de pedidos",
    });
  }
});

// GET /api/admin/orders/stats/dashboard - Get resume
adminOrdersRouter.get(
  "/stats/dashboard",
  async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        [todayStats],
        [monthStats],
        [pendingStats],
        [processingStats],
        [shippedToday],
        [pendingPayments],
      ] = await Promise.all([
        db
          .select({ orders: count(), revenue: sum(orderTable.total) })
          .from(orderTable)
          .where(gte(orderTable.createdAt, today)),
        db
          .select({ orders: count(), revenue: sum(orderTable.total) })
          .from(orderTable)
          .where(gte(orderTable.createdAt, monthStart)),
        db
          .select({ count: count() })
          .from(orderTable)
          .where(eq(orderTable.status, "pending" as OrderStatus)),
        db
          .select({ count: count() })
          .from(orderTable)
          .where(eq(orderTable.status, "processing" as OrderStatus)),
        db
          .select({ count: count() })
          .from(orderTable)
          .where(
            and(
              eq(orderTable.status, "shipped" as OrderStatus),
              gte(orderTable.updatedAt, today),
            ),
          ),
        db
          .select({ count: count(), total: sum(orderTable.total) })
          .from(orderTable)
          .where(eq(orderTable.paymentStatus, "pending" as PaymentStatus)),
      ]);

      res.json({
        success: true,
        data: {
          today: {
            orders: Number(todayStats?.orders) || 0,
            revenue: Number(todayStats?.revenue) || 0,
          },
          month: {
            orders: Number(monthStats?.orders) || 0,
            revenue: Number(monthStats?.revenue) || 0,
          },
          pending: { orders: Number(pendingStats?.count) || 0 },
          processing: { orders: Number(processingStats?.count) || 0 },
          shippedToday: Number(shippedToday?.count) || 0,
          pendingPayments: {
            orders: Number(pendingPayments?.count) || 0,
            total: Number(pendingPayments?.total) || 0,
          },
        },
      });
    } catch (error) {
      console.error("Admin orders dashboard error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar estatísticas do dashboard",
      });
    }
  },
);

export default adminOrdersRouter;
