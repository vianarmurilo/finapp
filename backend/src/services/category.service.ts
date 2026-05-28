import { TransactionType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { CategoryExtendedRepository } from "../repositories/category-extended.repository";
import { AppError } from "../utils/app-error";

const listCategoryQuerySchema = z.object({
  type: z.enum(TransactionType).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(TransactionType),
  icon: z.string().max(80).optional(),
  color: z.string().max(20).optional(),
  keywords: z.array(z.string().min(2).max(30)).max(20).optional(),
});

const categorySuggestionSchema = z.object({
  description: z.string().min(2).max(255),
});

const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    icon: z.string().max(80).optional(),
    color: z.string().max(20).optional(),
    keywords: z.array(z.string().min(2).max(30)).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para atualizar");

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export class CategoryService {
  constructor(private readonly categoryRepository: CategoryExtendedRepository) {}

  async list(userId: string, rawQuery: unknown) {
    const query = listCategoryQuerySchema.parse(rawQuery);
    return this.categoryRepository.listByUser(userId, query.type);
  }

  async create(userId: string, rawInput: unknown) {
    const input = createCategorySchema.parse(rawInput);
    return this.categoryRepository.create({ userId, ...input });
  }

  async suggest(userId: string, rawQuery: unknown) {
    const query = categorySuggestionSchema.parse(rawQuery);
    const tokens = normalizeTokens(query.description);
    const category = await this.categoryRepository.suggestCategory(userId, tokens);

    return {
      description: query.description,
      tokens,
      suggestion: category,
    };
  }

  async update(userId: string, categoryId: string, rawInput: unknown) {
    const input = updateCategorySchema.parse(rawInput);
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Categoria nao encontrada", 404);
    }

    if (category.userId !== userId) {
      throw new AppError("Nao e permitido editar categorias globais ou de outros usuarios", 403);
    }

    return this.categoryRepository.update(categoryId, userId, input);
  }

  async delete(userId: string, categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Categoria nao encontrada", 404);
    }

    if (category.userId !== userId) {
      throw new AppError("Nao e permitido excluir categorias globais ou de outros usuarios", 403);
    }

    try {
      await this.categoryRepository.delete(categoryId, userId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError("Categoria vinculada a transacoes e nao pode ser excluida", 409);
      }
      throw error;
    }
  }
}
