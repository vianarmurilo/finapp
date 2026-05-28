"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(3333),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default("1d"),
    ADMIN_EMAILS: zod_1.z.string().default(""),
    SYSTEM_ADMIN_EMAIL: zod_1.z.string().default(""),
    SYSTEM_ADMIN_PASSWORD: zod_1.z.string().default(""),
    EXCLUSIVE_ADMIN_EMAIL: zod_1.z.string().default("murilo@gmail.com"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Falha na validacao das variaveis de ambiente");
}
exports.env = parsed.data;
