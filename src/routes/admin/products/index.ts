import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import {
  productTable,
  categoryTable,
  productVariantTable,
} from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { eq, and, or, desc, inArray, count, ilike, not } from "drizzle-orm";
import { slugify } from "../../../utils/slugify.js";

const adminProductsRouter = express.Router();

// middleware
adminProductsRouter.use(authenticate);
adminProductsRouter.use(authorize("admin"));

// POST /api/admin/products - Create product
adminProductsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, categoryId } = req.body;

    if (!name || !description || !categoryId) {
      return res.status(400).json({
        success: false,
        error: "Nome, descrição e categoria são obrigatórios",
      });
    }

    const [category] = await db
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(eq(categoryTable.id, categoryId))
      .limit(1);

    if (!category) {
      return res.status(400).json({
        success: false,
        error: "Categoria não encontrada",
      });
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingProduct = await db
        .select({ id: productTable.id })
        .from(productTable)
        .where(eq(productTable.slug, slug))
        .limit(1);

      if (existingProduct.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const [newProduct] = await db
      .insert(productTable)
      .values({
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      data: newProduct,
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar produto",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/admin/products - Get all products
adminProductsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    const whereConditions = [];

    if (category && typeof category === "string") {
      whereConditions.push(eq(productTable.categoryId, category));
    }

    if (search && typeof search === "string") {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereConditions.push(
        or(
          ilike(productTable.name, searchTerm),
          ilike(productTable.description, searchTerm),
        ),
      );
    }

    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        slug: productTable.slug,
        description: productTable.description,
        createdAt: productTable.createdAt,
        category: {
          id: categoryTable.id,
          name: categoryTable.name,
          slug: categoryTable.slug,
        },
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(productTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // Get variant counts in batch
    const productIds = products.map((p) => p.id);
    let variantCounts: { productId: string; count: number }[] = [];

    if (productIds.length > 0) {
      variantCounts = await db
        .select({
          productId: productVariantTable.productId,
          count: count(productVariantTable.id),
        })
        .from(productVariantTable)
        .where(inArray(productVariantTable.productId, productIds))
        .groupBy(productVariantTable.productId);
    }

    // Create count map
    const variantCountMap = new Map(
      variantCounts.map((vc) => [vc.productId, Number(vc.count)]),
    );

    // Format response
    const formattedProducts = products.map((product) => ({
      ...product,
      variantCount: variantCountMap.get(product.id) || 0,
    }));

    // Count total
    const [countResult] = await db
      .select({ count: count() })
      .from(productTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = Number(countResult?.count) || 0;
    const currentPage = Math.floor(Number(offset) / Number(limit)) + 1;
    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: formattedProducts,
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
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar produtos",
    });
  }
});

// GET /api/admin/products/:id - Get product by ID
adminProductsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID do produto não fornecido",
      });
    }

    const [product] = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        slug: productTable.slug,
        description: productTable.description,
        createdAt: productTable.createdAt,
        category: {
          id: categoryTable.id,
          name: categoryTable.name,
          slug: categoryTable.slug,
        },
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(eq(productTable.id, id))
      .limit(1);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    const variants = await db
      .select({
        id: productVariantTable.id,
        name: productVariantTable.name,
        slug: productVariantTable.slug,
        color: productVariantTable.color,
        priceInCents: productVariantTable.priceInCents,
        imageUrl: productVariantTable.imageUrl,
        createdAt: productVariantTable.createdAt,
      })
      .from(productVariantTable)
      .where(eq(productVariantTable.productId, id))
      .orderBy(productVariantTable.createdAt);

    const [variantCountResult] = await db
      .select({ count: count() })
      .from(productVariantTable)
      .where(eq(productVariantTable.productId, id));

    const variantCount = Number(variantCountResult?.count) || 0;

    const formattedProduct = {
      ...product,
      variants,
      variantCount,
    };

    res.json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar produto",
    });
  }
});

// PUT /api/admin/products/:id - Update product
adminProductsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId } = req.body;

    if (!id) {
      return res.status(404).json({
        success: false,
        error: "Id do produto não encontrada",
      });
    }

    const [existingProduct] = await db
      .select()
      .from(productTable)
      .where(eq(productTable.id, id))
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    if (categoryId) {
      const [category] = await db
        .select({ id: categoryTable.id })
        .from(categoryTable)
        .where(eq(categoryTable.id, categoryId))
        .limit(1);

      if (!category) {
        return res.status(400).json({
          success: false,
          error: "Categoria não encontrada",
        });
      }
    }

    let newSlug = existingProduct.slug;
    if (name && name !== existingProduct.name) {
      const baseSlug = slugify(name);
      let tempSlug = baseSlug;
      let counter = 1;

      // verify if the slug already exist
      while (true) {
        const existing = await db
          .select({ id: productTable.id })
          .from(productTable)
          .where(
            and(eq(productTable.slug, tempSlug), not(eq(productTable.id, id))),
          )
          .limit(1);

        if (existing.length === 0) break;
        tempSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      newSlug = tempSlug;
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description) updateData.description = description.trim();
    if (categoryId) updateData.categoryId = categoryId;
    if (name && name !== existingProduct.name) updateData.slug = newSlug;

    const [updatedProduct] = await db
      .update(productTable)
      .set(updateData)
      .where(eq(productTable.id, id))
      .returning();

    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar produto",
    });
  }
});

// DELETE /api/admin/products/:id - Delete product
adminProductsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID do produto não fornecido",
      });
    }

    const [product] = await db
      .select({
        id: productTable.id,
        name: productTable.name,
      })
      .from(productTable)
      .where(eq(productTable.id, id))
      .limit(1);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
      });
    }

    const variantCountResult = await db
      .select({ count: count() })
      .from(productVariantTable)
      .where(eq(productVariantTable.productId, id));

    const variantCount = Number(variantCountResult[0]?.count) || 0;

    // cant delete product with theres any variant
    if (variantCount > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Não é possível remover produto com variantes. Remova as variantes primeiro.",
        variantCount,
      });
    }

    await db.delete(productTable).where(eq(productTable.id, id));

    res.json({
      success: true,
      message: "Produto removido com sucesso",
      data: {
        id: product.id,
        name: product.name,
      },
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover produto",
    });
  }
});

export default adminProductsRouter;
