import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { count, eq } from "drizzle-orm";
import { success } from "zod";
import { categoryTable } from "../../db/schema.js";

const publicCategoriesRouter = Router();

// GET /api/categories - List all category with products count
publicCategoriesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { withProductCount = "true" } = req.query;

    const categories = await db.query.categoryTable.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
      with: {
        products: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    let formattedCategories;

    if (withProductCount === "true") {
      formattedCategories = categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt,
        productCount: category.products?.length || 0,
      }));
    } else {
      formattedCategories = categories.map(({ products, ...category }) => ({
        ...category,
      }));
    }

    res.json({
      success: true,
      data: formattedCategories,
      count: formattedCategories.length,
    });
  } catch (error) {
    console.error("Get public categories error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar categorias",
    });
  }
});

// GET /api/categories/:slug - category details by slug
publicCategoriesRouter.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(404).json({
        success: false,
        error: "Slug não encontrado",
      });
    }

    const category = await db.query.categoryTable.findFirst({
      where: eq(categoryTable.slug, slug),
      with: {
        products: {
          columns: {
            id: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Categoria não encontrada",
      });
    }

    res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt,
        productCount: category.products?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get category by slug error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar categoria",
    });
  }
});

// GET /api/categories/:id/products - List products from a especific category
publicCategoriesRouter.get(
  "/:id/products",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "Id não encontrado",
        });
      }

      const category = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.id, id),
        columns: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Categoria não encontrada",
        });
      }

      res.json({
        success: true,
        message: "Use /api/products?category=:categoryId para filtrar produtos",
        data: {
          category,
          productsUrl: `/api/products?category=${category.id}&limit=${limit}&offset=${offset}`,
        },
      });
    } catch (error) {
      console.error("Get category products error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao listar produtos da categoria",
      });
    }
  },
);

export default publicCategoriesRouter;
