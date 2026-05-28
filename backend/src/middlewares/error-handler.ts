import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined;
  const maybeMessage = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  return (
    maybeCode === "ECONNREFUSED" ||
    maybeCode === "P1000" ||
    maybeCode === "P1001" ||
    maybeMessage.includes("ECONNREFUSED") ||
    maybeMessage.includes("Authentication failed against the database server") ||
    maybeMessage.includes("Can't reach database server")
  );
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({ message: "Dados invalidos", issues: error.issues });
    return;
  }

  if (isDatabaseUnavailable(error)) {
    res.status(503).json({ message: "Banco de dados indisponivel. Tente novamente em instantes." });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Erro interno no servidor" });
}
