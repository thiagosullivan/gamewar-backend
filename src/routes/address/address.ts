import express from "express";
import type { Request, Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { addressTable } from "../../db/schema.js";
import { authenticate } from "../../middleware/auth.js";

const addressRouter = express.Router();

// middleware
addressRouter.use(authenticate);

// POST /api/addresses - Add new address
addressRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      country = "Brasil",
      type = "home",
      isDefault = false,
    } = req.body;

    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        error:
          "Campos obrigatórios faltando: rua, número, bairro, cidade, estado e CEP",
      });
    }

    // if define as default set any other address to ifDefault = false
    if (isDefault) {
      await db
        .update(addressTable)
        .set({ isDefault: false })
        .where(eq(addressTable.userId, userId));
    }

    const [newAddress] = await db
      .insert(addressTable)
      .values({
        userId,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        country,
        type,
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Endereço criado com sucesso",
      address: newAddress,
    });
  } catch (error: any) {
    console.error("Create address error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar endereço",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/addresses - Get all addressess
addressRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const addresses = await db
      .select()
      .from(addressTable)
      .where(eq(addressTable.userId, userId))
      .orderBy(desc(addressTable.isDefault), desc(addressTable.createdAt));

    res.json({
      success: true,
      addresses,
      count: addresses.length,
    });
  } catch (error: any) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar endereços",
    });
  }
});

// GET /api/addresses/:id - Get address by ID
addressRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id;

    if (!addressId) {
      return res.status(401).json({ error: "ID endereço não encontrado" });
    }

    const [address] = await db
      .select()
      .from(addressTable)
      .where(
        and(eq(addressTable.id, addressId), eq(addressTable.userId, userId)),
      )
      .limit(1);

    if (!address) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error: any) {
    console.error("Get address error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter endereço",
    });
  }
});

// PUT /api/addresses/:id - Update address
addressRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id;
    const updateData = req.body;

    if (!addressId) {
      return res.status(401).json({ error: "ID endereço não encontrado" });
    }

    const [existingAddress] = await db
      .select()
      .from(addressTable)
      .where(
        and(eq(addressTable.id, addressId), eq(addressTable.userId, userId)),
      )
      .limit(1);

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    // if define as default set any other address to ifDefault = false
    if (updateData.isDefault === true) {
      await db
        .update(addressTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(addressTable.userId, userId),
            eq(addressTable.isDefault, true),
          ),
        );
    }

    const [updatedAddress] = await db
      .update(addressTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(addressTable.id, addressId))
      .returning();

    res.json({
      success: true,
      message: "Endereço atualizado com sucesso",
      address: updatedAddress,
    });
  } catch (error: any) {
    console.error("Update address error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar endereço",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// DELETE /api/addresses/:id - Delete address
addressRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id;

    if (!addressId) {
      return res.status(401).json({ error: "ID endereço não encontrado" });
    }

    const [existingAddress] = await db
      .select()
      .from(addressTable)
      .where(
        and(eq(addressTable.id, addressId), eq(addressTable.userId, userId)),
      )
      .limit(1);

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    // cant delete an address if its unique and default
    if (existingAddress.isDefault) {
      const otherAddresses = await db
        .select()
        .from(addressTable)
        .where(
          and(
            eq(addressTable.userId, userId),
            eq(addressTable.isDefault, false),
          ),
        );

      if (otherAddresses.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Não é possível remover o único endereço padrão",
        });
      }
    }

    await db.delete(addressTable).where(eq(addressTable.id, addressId));

    res.json({
      success: true,
      message: "Endereço removido com sucesso",
    });
  } catch (error: any) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao remover endereço",
    });
  }
});

// PATCH /api/addresses/:id/set-default - Define address as default
addressRouter.patch("/:id/set-default", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const addressId = req.params.id;

    if (!addressId) {
      return res.status(401).json({ error: "ID endereço não encontrado" });
    }

    const [existingAddress] = await db
      .select()
      .from(addressTable)
      .where(
        and(eq(addressTable.id, addressId), eq(addressTable.userId, userId)),
      )
      .limit(1);

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado",
      });
    }

    await db
      .update(addressTable)
      .set({ isDefault: false })
      .where(eq(addressTable.userId, userId));

    const [updatedAddress] = await db
      .update(addressTable)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(eq(addressTable.id, addressId))
      .returning();

    res.json({
      success: true,
      message: "Endereço definido como padrão",
      address: updatedAddress,
    });
  } catch (error: any) {
    console.error("Set default address error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao definir endereço padrão",
    });
  }
});

export default addressRouter;
