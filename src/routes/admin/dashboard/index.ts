import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, gte, lte, count, sum, desc, asc, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  orderTable,
  orderItemTable,
  userTable,
  productTable,
  productVariantTable,
  categoryTable,
} from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";

const adminDashboardRouter = Router();

adminDashboardRouter.use(authenticate);
adminDashboardRouter.use(authorize("admin"));

// GET /api/admin/dashboard - general metrics dashboard
adminDashboardRouter.get("/", async (req: Request, res: Response) => {
  try {
    // set today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    lastMonthEnd.setHours(23, 59, 59, 999);

    // SALES
    // today
    const [salesToday] = await db
      .select({
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(gte(orderTable.createdAt, today));

    // Week
    const [salesWeek] = await db
      .select({
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(gte(orderTable.createdAt, weekAgo));

    // month
    const [salesMonth] = await db
      .select({
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(gte(orderTable.createdAt, monthStart));

    // last month gte
    const [salesLastMonth] = await db
      .select({
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, lastMonthStart),
          lte(orderTable.createdAt, lastMonthEnd),
        ),
      );

    // Products
    // total
    const [totalProducts] = await db
      .select({ count: count() })
      .from(productTable);

    // products out of stock
    const [outOfStockProducts] = await db
      .select({ count: count() })
      .from(productVariantTable)
      .where(eq(productVariantTable.priceInCents, 0));

    // almost out of stock (5 products left)
    // Como não temos campo de estoque, vamos contar variantes
    const [lowStockProducts] = await db
      .select({ count: count() })
      .from(productVariantTable)
      .where(lte(productVariantTable.priceInCents, 1000));

    // top 5 most saled
    const topProducts = await db
      .select({
        name: orderItemTable.productName,
        sold: sum(orderItemTable.quantity),
        revenue: sum(orderItemTable.totalPrice),
      })
      .from(orderItemTable)
      .groupBy(orderItemTable.productName)
      .orderBy(desc(sql`SUM(${orderItemTable.quantity})`))
      .limit(5);

    // Clients
    // total costumes
    const [totalCustomers] = await db
      .select({ count: count() })
      .from(userTable);

    // new costumers (today)
    const [newCustomersToday] = await db
      .select({ count: count() })
      .from(userTable)
      .where(gte(userTable.createdAt, today));

    // new costumers (month)
    const [newCustomersMonth] = await db
      .select({ count: count() })
      .from(userTable)
      .where(gte(userTable.createdAt, monthStart));

    // active client today (orders)
    const [activeCustomersToday] = await db
      .select({ count: count() })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, today),
          eq(orderTable.status, "delivered"),
        ),
      );

    // Pending orders
    // (pending)
    const [pendingOrders] = await db
      .select({ count: count() })
      .from(orderTable)
      .where(eq(orderTable.status, "pending"));

    // to send (processing)
    const [processingOrders] = await db
      .select({ count: count() })
      .from(orderTable)
      .where(eq(orderTable.status, "processing"));

    // to delivery (shipped)
    const [shippedOrders] = await db
      .select({ count: count() })
      .from(orderTable)
      .where(eq(orderTable.status, "shipped"));

    // revenue
    // average ticket price
    const [averageTicket] = await db
      .select({
        avg: sql<number>`AVG(${orderTable.total})`,
      })
      .from(orderTable);

    // revenue by payment method
    const revenueByPayment = await db
      .select({
        method: orderTable.paymentMethod,
        total: sum(orderTable.total),
      })
      .from(orderTable)
      .groupBy(orderTable.paymentMethod);

    // recent activities
    const recentOrders = await db
      .select({
        id: orderTable.id,
        orderNumber: orderTable.orderNumber,
        total: orderTable.total,
        status: orderTable.status,
        createdAt: orderTable.createdAt,
      })
      .from(orderTable)
      .orderBy(desc(orderTable.createdAt))
      .limit(10);

    const recentActivity = recentOrders.map((order) => ({
      type: "order",
      message: `Novo pedido ${order.orderNumber} - R$ ${(order.total / 100).toFixed(2)}`,
      time: order.createdAt,
      status: order.status,
    }));

    // format res
    const salesLastMonthRevenue = Number(salesLastMonth?.revenue) || 0;
    const salesMonthRevenue = Number(salesMonth?.revenue) || 0;
    const growth =
      salesLastMonthRevenue > 0
        ? ((salesMonthRevenue - salesLastMonthRevenue) /
            salesLastMonthRevenue) *
          100
        : 0;

    res.json({
      success: true,
      data: {
        sales: {
          today: {
            orders: Number(salesToday?.orders) || 0,
            revenue: Number(salesToday?.revenue) || 0,
          },
          week: {
            orders: Number(salesWeek?.orders) || 0,
            revenue: Number(salesWeek?.revenue) || 0,
          },
          month: {
            orders: Number(salesMonth?.orders) || 0,
            revenue: salesMonthRevenue,
          },
          growth: Number(growth.toFixed(1)),
        },
        products: {
          total: Number(totalProducts?.count) || 0,
          outOfStock: Number(outOfStockProducts?.count) || 0,
          lowStock: Number(lowStockProducts?.count) || 0,
          topSellers: topProducts.map((p) => ({
            name: p.name,
            sold: Number(p.sold) || 0,
            revenue: Number(p.revenue) || 0,
          })),
        },
        customers: {
          total: Number(totalCustomers?.count) || 0,
          newToday: Number(newCustomersToday?.count) || 0,
          newThisMonth: Number(newCustomersMonth?.count) || 0,
          activeToday: Number(activeCustomersToday?.count) || 0,
        },
        pendingOrders: {
          toProcess: Number(pendingOrders?.count) || 0,
          toShip: Number(processingOrders?.count) || 0,
          toDeliver: Number(shippedOrders?.count) || 0,
        },
        revenue: {
          total: salesMonthRevenue,
          averageTicket: Number(averageTicket?.avg) || 0,
          byPaymentMethod: revenueByPayment.map((r) => ({
            method: r.method,
            total: Number(r.total) || 0,
          })),
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar dashboard",
    });
  }
});

// GET /api/admin/analytics - analytics for charts
adminDashboardRouter.get("/analytics", async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;

    // calculate initial data
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

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

    // sales by day
    const salesByDay = await db
      .select({
        date: sql<string>`DATE(${orderTable.createdAt})`,
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(sql`DATE(${orderTable.createdAt})`)
      .orderBy(asc(sql`DATE(${orderTable.createdAt})`));

    // sales by category
    const salesByCategory = await db
      .select({
        category: categoryTable.name,
        revenue: sum(orderItemTable.totalPrice),
      })
      .from(orderItemTable)
      .innerJoin(orderTable, eq(orderItemTable.orderId, orderTable.id))
      .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .innerJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(categoryTable.name)
      .orderBy(desc(sql`SUM(${orderItemTable.totalPrice})`))
      .limit(10);

    // orders by status
    const ordersByStatus = await db
      .select({
        status: orderTable.status,
        count: count(),
        total: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(orderTable.status)
      .orderBy(orderTable.status);

    // payments by methods
    const paymentsByMethod = await db
      .select({
        method: orderTable.paymentMethod,
        count: count(),
        total: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(orderTable.paymentMethod)
      .orderBy(desc(sql`COUNT(*)`));

    // top products
    const topProducts = await db
      .select({
        name: orderItemTable.productName,
        variant: orderItemTable.variantName,
        sold: sum(orderItemTable.quantity),
        revenue: sum(orderItemTable.totalPrice),
      })
      .from(orderItemTable)
      .innerJoin(orderTable, eq(orderItemTable.orderId, orderTable.id))
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
          eq(orderTable.status, "delivered"),
        ),
      )
      .groupBy(orderItemTable.productName, orderItemTable.variantName)
      .orderBy(desc(sql`SUM(${orderItemTable.quantity})`))
      .limit(10);

    // sales by hour
    const salesByHour = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${orderTable.createdAt})`,
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${orderTable.createdAt})`)
      .orderBy(asc(sql`EXTRACT(HOUR FROM ${orderTable.createdAt})`));

    // sales by week day
    const salesByWeekday = await db
      .select({
        weekday: sql<number>`EXTRACT(DOW FROM ${orderTable.createdAt})`,
        orders: count(),
        revenue: sum(orderTable.total),
      })
      .from(orderTable)
      .where(
        and(
          gte(orderTable.createdAt, startDate),
          lte(orderTable.createdAt, endDate),
        ),
      )
      .groupBy(sql`EXTRACT(DOW FROM ${orderTable.createdAt})`)
      .orderBy(asc(sql`EXTRACT(DOW FROM ${orderTable.createdAt})`));

    // sales by states
    // Como não temos estado no orderItem, vamos pular ou usar um placeholder
    const salesByState: any[] = [];

    // ========== FORMATAR RESPOSTA ==========
    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        salesByDay: salesByDay.map((day) => ({
          date: day.date,
          orders: Number(day.orders),
          revenue: Number(day.revenue),
        })),
        salesByCategory: salesByCategory.map((cat) => ({
          category: cat.category,
          revenue: Number(cat.revenue),
          percentage: 0, // Calcular no frontend
        })),
        ordersByStatus: ordersByStatus.map((s) => ({
          status: s.status,
          count: Number(s.count),
          total: Number(s.total),
        })),
        paymentsByMethod: paymentsByMethod.map((p) => ({
          method: p.method,
          count: Number(p.count),
          total: Number(p.total),
        })),
        topProducts: topProducts.map((p) => ({
          name: p.name,
          variant: p.variant,
          sold: Number(p.sold),
          revenue: Number(p.revenue),
        })),
        salesByHour: salesByHour.map((h) => ({
          hour: Number(h.hour),
          orders: Number(h.orders),
          revenue: Number(h.revenue),
        })),
        salesByWeekday: salesByWeekday.map((d) => ({
          weekday: Number(d.weekday),
          orders: Number(d.orders),
          revenue: Number(d.revenue),
        })),
        salesByState,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar analytics",
    });
  }
});

export default adminDashboardRouter;
