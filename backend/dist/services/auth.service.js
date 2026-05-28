"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const env_1 = require("../config/env");
const app_error_1 = require("../utils/app-error");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    email: zod_1.z.email().toLowerCase(),
    password: zod_1.z.string().min(8).max(64),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.email().toLowerCase(),
    password: zod_1.z.string().min(8).max(64),
});
class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    isExclusiveAdminEmail(email) {
        return email.toLowerCase() === env_1.env.EXCLUSIVE_ADMIN_EMAIL.toLowerCase();
    }
    isSystemAdminLogin(email, password) {
        const systemAdminEmail = env_1.env.SYSTEM_ADMIN_EMAIL.trim().toLowerCase();
        const systemAdminPassword = env_1.env.SYSTEM_ADMIN_PASSWORD;
        if (!systemAdminEmail || !systemAdminPassword) {
            return false;
        }
        return email.toLowerCase() == systemAdminEmail && password == systemAdminPassword;
    }
    async ensureSystemAdminUser(input) {
        const existingUser = await this.userRepository.findByEmail(input.email);
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        if (existingUser) {
            return this.userRepository.updateAuthById(existingUser.id, {
                passwordHash,
                role: "ADMIN",
            });
        }
        return this.userRepository.create({
            name: "Administrador do Sistema",
            email: input.email,
            passwordHash,
            role: "ADMIN",
        });
    }
    isAdminEmail(email) {
        const allowed = env_1.env.ADMIN_EMAILS.split(",")
            .map((item) => item.trim().toLowerCase())
            .filter((item) => item.length > 0);
        return allowed.includes(email.toLowerCase());
    }
    async register(rawInput) {
        const input = registerSchema.parse(rawInput);
        const existingUser = await this.userRepository.findByEmail(input.email);
        if (existingUser) {
            throw new app_error_1.AppError("E-mail ja cadastrado", 409);
        }
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await this.userRepository.create({
            name: input.name,
            email: input.email,
            passwordHash,
            role: this.isExclusiveAdminEmail(input.email) ? "ADMIN" : "USER",
        });
        const token = this.generateToken(user.id, user.email, user.role);
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                currency: user.currency,
                role: user.role,
            },
        };
    }
    async login(rawInput) {
        const input = loginSchema.parse(rawInput);
        if (this.isSystemAdminLogin(input.email, input.password)) {
            const adminUser = await this.ensureSystemAdminUser(input);
            const role = this.isExclusiveAdminEmail(adminUser.email) ? "ADMIN" : "USER";
            const token = this.generateToken(adminUser.id, adminUser.email, role);
            return {
                token,
                user: {
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                    currency: adminUser.currency,
                    role,
                },
            };
        }
        const user = await this.userRepository.findByEmail(input.email);
        if (!user) {
            throw new app_error_1.AppError("Credenciais invalidas", 401);
        }
        if (user.isBlocked) {
            throw new app_error_1.AppError("Usuario bloqueado. Contate um administrador", 403);
        }
        const passwordMatch = await bcryptjs_1.default.compare(input.password, user.passwordHash);
        if (!passwordMatch) {
            throw new app_error_1.AppError("Credenciais invalidas", 401);
        }
        // Corrige dados legados para garantir admin exclusivo por e-mail.
        if (user.role === "ADMIN" && !this.isExclusiveAdminEmail(user.email)) {
            await this.userRepository.updateRoleById(user.id, "USER");
            const token = this.generateToken(user.id, user.email, "USER");
            return {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    currency: user.currency,
                    role: "USER",
                },
            };
        }
        // Garante que o admin exclusivo sempre autentique com role ADMIN.
        if (this.isExclusiveAdminEmail(user.email) && user.role !== "ADMIN") {
            await this.userRepository.updateRoleById(user.id, "ADMIN");
            const token = this.generateToken(user.id, user.email, "ADMIN");
            return {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    currency: user.currency,
                    role: "ADMIN",
                },
            };
        }
        const token = this.generateToken(user.id, user.email, user.role);
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                currency: user.currency,
                role: user.role,
            },
        };
    }
    generateToken(userId, email, role = "USER") {
        const options = {
            subject: userId,
            expiresIn: env_1.env.JWT_EXPIRES_IN,
        };
        return jsonwebtoken_1.default.sign({ email, role }, env_1.env.JWT_SECRET, options);
    }
}
exports.AuthService = AuthService;
