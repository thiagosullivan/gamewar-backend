import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { categoryTable } from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { eq } from "drizzle-orm";
import { slugify } from "../../../utils/slugify.js";

const adminCategoriesRouter = express.Router();

// middleware
adminCategoriesRouter.use(authenticate);
adminCategoriesRouter.use(authorize("admin"));

// POST /api/admin/categories - Create category
adminCategoriesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Nome da categoria é obrigatório (mínimo 2 caracteres)",
      });
    }

    const slug = slugify(name);

    const existingCategory = await db
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(eq(categoryTable.slug, slug))
      .limit(1);

    if (existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Uma categoria com nome similar já existe",
      });
    }

    const [newCategory] = await db
      .insert(categoryTable)
      .values({
        name: name.trim(),
        slug,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Categoria criada com sucesso",
      data: newCategory,
    });
  } catch (error: any) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar categoria",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/admin/categories - Get categories with product count
adminCategoriesRouter.get("/", async (req: Request, res: Response) => {
  try {
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

    const categoriesWithCount = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      createdAt: category.createdAt,
      productCount: category.products.length,
    }));

    res.json({
      success: true,
      data: categoriesWithCount,
      count: categoriesWithCount.length,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar categorias",
    });
  }
});

// PUT /api/admin/categories/:id - Update category
adminCategoriesRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Nome da categoria é obrigatório",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Id da categoria não encontrado",
      });
    }

    // Verifica se categoria existe
    const [existingCategory] = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.id, id))
      .limit(1);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: "Categoria não encontrada",
      });
    }

    // generate new slug if it changes
    const newSlug =
      name !== existingCategory.name ? slugify(name) : existingCategory.slug;

    // check if new slug already exist
    if (newSlug !== existingCategory.slug) {
      const existingSlug = await db
        .select({ id: categoryTable.id })
        .from(categoryTable)
        .where(eq(categoryTable.slug, newSlug))
        .limit(1);

      if (existingSlug.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Já existe uma categoria com esse nome",
        });
      }
    }

    const [updatedCategory] = await db
      .update(categoryTable)
      .set({
        name: name.trim(),
        slug: newSlug,
      })
      .where(eq(categoryTable.id, id))
      .returning();

    res.json({
      success: true,
      message: "Categoria atualizada com sucesso",
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar categoria",
    });
  }
});

// DELETE /api/admin/categories/:id - Delete category
adminCategoriesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Id da categoria não encontrado",
      });
    }

    const category = await db.query.categoryTable.findFirst({
      where: (categories, { eq }) => eq(categories.id, id),
      with: {
        products: {
          columns: {
            id: true,
          },
          limit: 1,
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Categoria não encontrada",
      });
    }

    // dont let delete category with products
    if (category.products.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Não é possível remover categoria com produtos associados",
        productCount: category.products.length,
      });
    }

    await db.delete(categoryTable).where(eq(categoryTable.id, id));

    res.json({
      success: true,
      message: `Categoria '${category.name}' removida com sucesso`,
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover categoria",
    });
  }
});

export default adminCategoriesRouter;
