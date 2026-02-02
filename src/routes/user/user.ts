import express from "express";
import { db } from "../../db/index.js";
import { userTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { authenticate } from "../../middleware/auth.js";

const userRouter = express.Router();

// Middleware
userRouter.use(authenticate);

// PUT /api/user/profile - Update Profile
userRouter.put("/profile", async (req, res) => {
  try {
    const { name, image, phone } = req.body;
    const userId = req.user?.id;

    if (!name && !image && !phone) {
      return res.status(400).json({
        success: false,
        error: "Nenhum dado para atualizar",
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (image) updateData.image = image;
    if (phone !== undefined) updateData.phone = phone;

    if (!userId) {
      return res.status(401).json({ error: "ID do usuário não encontrado" });
    }
    // update on db
    const updatedUser = await db
      .update(userTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Perfil atualizado com sucesso",
      user: {
        id: updatedUser[0]?.id,
        name: updatedUser[0]?.name,
        email: updatedUser[0]?.email,
        image: updatedUser[0]?.image,
        phone: updatedUser[0]?.phone,
        emailVerified: updatedUser[0]?.emailVerified,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);

    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: "Email já está em uso",
      });
    }

    res.status(500).json({
      success: false,
      error: "Erro ao atualizar perfil",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/user/profile - Get Profile
userRouter.get("/profile", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "ID do usuário não encontrado" });
    }

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter perfil",
    });
  }
});

export default userRouter;
