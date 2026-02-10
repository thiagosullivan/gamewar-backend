import express from "express";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { productVariantTable, productTable } from "../../../db/schema.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { eq, and, not } from "drizzle-orm";
import { slugify } from "../../../utils/slugify.js";

const adminVariantsRouter = express.Router();

// middleware
adminVariantsRouter.use(authenticate);
adminVariantsRouter.use(authorize("admin"));

// POST /api/admin/products/:productId/variants - Create variant
adminVariantsRouter.post(
  "/:productId/variants",
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { name, color, priceInCents, imageUrl } = req.body;

      if (!name || !color || !priceInCents || !imageUrl) {
        return res.status(400).json({
          success: false,
          error: "Nome, cor, preço e imageUrl são obrigatórios",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: "Id do produto não encontrado",
        });
      }

      if (priceInCents <= 0) {
        return res.status(400).json({
          success: false,
          error: "Preço deve ser maior que zero",
        });
      }

      const [product] = await db
        .select({ id: productTable.id })
        .from(productTable)
        .where(eq(productTable.id, productId))
        .limit(1);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Produto não encontrado",
        });
      }

      const baseSlug = slugify(`${name}-${color}`);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const existingVariant = await db
          .select({ id: productVariantTable.id })
          .from(productVariantTable)
          .where(eq(productVariantTable.slug, slug))
          .limit(1);

        if (existingVariant.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const [newVariant] = await db
        .insert(productVariantTable)
        .values({
          productId,
          name: name.trim(),
          slug,
          color: color.trim(),
          priceInCents,
          imageUrl,
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({
        success: true,
        message: "Variante criada com sucesso",
        data: newVariant,
      });
    } catch (error: any) {
      console.error("Create variant error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao criar variante",
      });
    }
  },
);

// PUT /api/admin/products/variants/:id - Update variant
adminVariantsRouter.put(
  "/variants/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "ID da variante não fornecido",
        });
      }

      const [existingVariant] = await db
        .select()
        .from(productVariantTable)
        .where(eq(productVariantTable.id, id))
        .limit(1);

      if (!existingVariant) {
        return res.status(404).json({
          success: false,
          error: "Variante não encontrada",
        });
      }

      if (
        updateData.priceInCents !== undefined &&
        updateData.priceInCents <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Preço deve ser maior que zero",
        });
      }

      if (updateData.name !== undefined && !updateData.name.trim()) {
        return res.status(400).json({
          success: false,
          error: "Nome não pode ser vazio",
        });
      }

      if (updateData.color !== undefined && !updateData.color.trim()) {
        return res.status(400).json({
          success: false,
          error: "Cor não pode ser vazia",
        });
      }

      let newSlug = existingVariant.slug;
      if (
        (updateData.name && updateData.name !== existingVariant.name) ||
        (updateData.color && updateData.color !== existingVariant.color)
      ) {
        const newName = updateData.name || existingVariant.name;
        const newColor = updateData.color || existingVariant.color;
        const baseSlug = slugify(`${newName}-${newColor}`);
        let tempSlug = baseSlug;
        let counter = 1;

        while (true) {
          const existing = await db
            .select({ id: productVariantTable.id })
            .from(productVariantTable)
            .where(
              and(
                eq(productVariantTable.slug, tempSlug),
                not(eq(productVariantTable.id, id)),
              ),
            )
            .limit(1);

          if (existing.length === 0) break;
          tempSlug = `${baseSlug}-${counter}`;
          counter++;
        }
        newSlug = tempSlug;
        updateData.slug = newSlug;
      }

      const finalUpdateData: any = {};

      if (updateData.name !== undefined) {
        finalUpdateData.name = updateData.name.trim();
      }

      if (updateData.color !== undefined) {
        finalUpdateData.color = updateData.color.trim();
      }

      if (updateData.priceInCents !== undefined) {
        finalUpdateData.priceInCents = updateData.priceInCents;
      }

      if (updateData.imageUrl !== undefined) {
        finalUpdateData.imageUrl = updateData.imageUrl.trim();
      }

      if (updateData.slug) {
        finalUpdateData.slug = updateData.slug;
      }

      if (Object.keys(finalUpdateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: "Nenhum dado fornecido para atualização",
        });
      }

      const [updatedVariant] = await db
        .update(productVariantTable)
        .set(finalUpdateData)
        .where(eq(productVariantTable.id, id))
        .returning();

      res.json({
        success: true,
        message: "Variante atualizada com sucesso",
        data: updatedVariant,
      });
    } catch (error: any) {
      console.error("Update variant error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao atualizar variante",
      });
    }
  },
);

// DELETE /api/admin/products/variants/:id - Delete variant
adminVariantsRouter.delete(
  "/variants/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(404).json({
          success: false,
          error: "Produto não encontrado",
        });
      }

      const [variant] = await db
        .select()
        .from(productVariantTable)
        .where(eq(productVariantTable.id, id))
        .limit(1);

      if (!variant) {
        return res.status(404).json({
          success: false,
          error: "Variante não encontrada",
        });
      }

      await db
        .delete(productVariantTable)
        .where(eq(productVariantTable.id, id));

      res.json({
        success: true,
        message: "Variante removida com sucesso",
      });
    } catch (error) {
      console.error("Delete variant error:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao remover variante",
      });
    }
  },
);

export default adminVariantsRouter;
