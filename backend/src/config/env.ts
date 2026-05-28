import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1d"),
  ADMIN_EMAILS: z.string().default(""),
  SYSTEM_ADMIN_EMAIL: z.string().default(""),
  SYSTEM_ADMIN_PASSWORD: z.string().default(""),
  EXCLUSIVE_ADMIN_EMAIL: z.string().default("murilo@gmail.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Falha na validacao das variaveis de ambiente");
}

export const env = parsed.data;
