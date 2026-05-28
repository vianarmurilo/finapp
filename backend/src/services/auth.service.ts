import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(64),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(64),
});

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  private isExclusiveAdminEmail(email: string): boolean {
    return email.toLowerCase() === env.EXCLUSIVE_ADMIN_EMAIL.toLowerCase();
  }

  private isSystemAdminLogin(email: string, password: string): boolean {
    const systemAdminEmail = env.SYSTEM_ADMIN_EMAIL.trim().toLowerCase();
    const systemAdminPassword = env.SYSTEM_ADMIN_PASSWORD;

    if (!systemAdminEmail || !systemAdminPassword) {
      return false;
    }

    return email.toLowerCase() == systemAdminEmail && password == systemAdminPassword;
  }

  private async ensureSystemAdminUser(input: {
    email: string;
    password: string;
  }) {
    const existingUser = await this.userRepository.findByEmail(input.email);
    const passwordHash = await bcrypt.hash(input.password, 10);

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

  private isAdminEmail(email: string): boolean {
    const allowed = env.ADMIN_EMAILS.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0);

    return allowed.includes(email.toLowerCase());
  }

  async register(rawInput: unknown) {
    const input = registerSchema.parse(rawInput);

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new AppError("E-mail ja cadastrado", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

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

  async login(rawInput: unknown) {
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
      throw new AppError("Credenciais invalidas", 401);
    }

    if (user.isBlocked) {
      throw new AppError("Usuario bloqueado. Contate um administrador", 403);
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError("Credenciais invalidas", 401);
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

  private generateToken(userId: string, email: string, role: "USER" | "ADMIN" = "USER"): string {
    const options: jwt.SignOptions = {
      subject: userId,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    };

    return jwt.sign({ email, role }, env.JWT_SECRET, options);
  }
}
