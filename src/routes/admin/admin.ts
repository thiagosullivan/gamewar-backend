import express from "express";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { userTable } from "../../db/schema.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

const adminUserRouter = express.Router();

// middleware to verify auth and role
adminUserRouter.use(authenticate);
adminUserRouter.use(authorize("admin"));

// GET /api/admin/users - Get All Users (only admins)
adminUserRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const users = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        emailVerified: userTable.emailVerified,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(desc(userTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar usuários",
    });
  }
});

// PATCH /api/admin/users/:id/role - Update user role
adminUserRouter.patch("/:id/role", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validação
    const validRoles = ["user", "moderator", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Role inválida. Use: user, moderator, admin",
      });
    }

    if (id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: "Não é possível alterar sua própria role",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Usuario não identificado",
      });
    }

    const [updatedUser] = await db
      .update(userTable)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, id))
      .returning({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
      });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Role atualizada com sucesso",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar role",
    });
  }
});

export default adminUserRouter;
