"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
function isDatabaseUnavailable(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const maybeCode = "code" in error ? error.code : undefined;
    const maybeMessage = "message" in error ? String(error.message ?? "") : "";
    return (maybeCode === "ECONNREFUSED" ||
        maybeCode === "P1000" ||
        maybeCode === "P1001" ||
        maybeMessage.includes("ECONNREFUSED") ||
        maybeMessage.includes("Authentication failed against the database server") ||
        maybeMessage.includes("Can't reach database server"));
}
function errorHandler(error, _req, res, _next) {
    if (error instanceof app_error_1.AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    if (error instanceof zod_1.ZodError) {
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
