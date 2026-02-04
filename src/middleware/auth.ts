import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";

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

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? undefined,
      phone: undefined,
      emailVerified: session.user.emailVerified,
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

// Middleware para verificar roles/permissões (exemplo)
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    // Aqui você pode verificar roles/permissões
    // Exemplo: if (!roles.includes(req.user.role)) return 403

    next();
  };
};
