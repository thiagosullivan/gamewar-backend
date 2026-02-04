import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userTable } from "../db/schema.js";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Não autenticado",
      });
    }

    const userFromDb = await db.query.userTable.findFirst({
      where: eq(userTable.id, session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        emailVerified: true,
        role: true,
      },
    });

    if (!userFromDb) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado no banco",
      });
    }

    req.user = {
      id: userFromDb.id,
      name: userFromDb.name,
      email: userFromDb.email,
      image: userFromDb.image ?? undefined,
      phone: userFromDb.phone ?? undefined,
      emailVerified: userFromDb.emailVerified,
      role: userFromDb.role,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Erro de autenticação",
    });
  }
};

// Middleware to verify roles/permitions
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Não autenticado",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Acesso negado. Permissão insuficiente.",
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};
