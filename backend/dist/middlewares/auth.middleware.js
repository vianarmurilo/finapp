"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAdminRole = requireAdminRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const app_error_1 = require("../utils/app-error");
function authMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new app_error_1.AppError("Token nao informado", 401);
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        throw new app_error_1.AppError("Formato de token invalido", 401);
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role ?? "USER",
        };
        next();
    }
    catch {
        throw new app_error_1.AppError("Token invalido ou expirado", 401);
    }
}
function requireAdminRole(req, _res, next) {
    if (!req.user) {
        throw new app_error_1.AppError("Nao autenticado", 401);
    }
    if (req.user.role !== "ADMIN") {
        throw new app_error_1.AppError("Acesso restrito a administradores", 403);
    }
    if (req.user.email.toLowerCase() !== env_1.env.EXCLUSIVE_ADMIN_EMAIL.toLowerCase()) {
        throw new app_error_1.AppError("Acesso restrito ao administrador principal", 403);
    }
    next();
}
