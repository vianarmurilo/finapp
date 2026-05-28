import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { JwtPayload } from "../types/auth";

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("Token nao informado", 401);
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError("Formato de token invalido", 401);
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role ?? "USER",
    };

    next();
  } catch {
    throw new AppError("Token invalido ou expirado", 401);
  }
}

export function requireAdminRole(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError("Nao autenticado", 401);
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError("Acesso restrito a administradores", 403);
  }

  if (req.user.email.toLowerCase() !== env.EXCLUSIVE_ADMIN_EMAIL.toLowerCase()) {
    throw new AppError("Acesso restrito ao administrador principal", 403);
  }

  next();
}
