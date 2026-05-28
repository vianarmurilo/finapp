import { TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";

export class CategoryExtendedRepository {
  async listByUser(userId: string, type?: TransactionType) {
    return prisma.category.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
        type,
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async create(input: {
    userId: string;
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    keywords?: string[];
  }) {
    return prisma.category.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        icon: input.icon,
        color: input.color,
        keywords: input.keywords ?? [],
        isDefault: false,
      },
    });
  }

  async findById(categoryId: string) {
    return prisma.category.findUnique({
      where: { id: categoryId },
    });
  }

  async update(
    categoryId: string,
    userId: string,
    input: {
      name?: string;
      icon?: string;
      color?: string;
      keywords?: string[];
    },
  ) {
    return prisma.category.update({
      where: {
        id: categoryId,
        userId,
      },
      data: {
        name: input.name,
        icon: input.icon,
        color: input.color,
        keywords: input.keywords,
      },
    });
  }

  async delete(categoryId: string, userId: string) {
    return prisma.category.delete({
      where: {
        id: categoryId,
        userId,
      },
    });
  }

  async suggestCategory(userId: string, normalizedTokens: string[]) {
    if (!normalizedTokens.length) {
      return null;
    }

    return prisma.category.findFirst({
      where: {
        OR: [{ userId }, { userId: null }],
        keywords: { hasSome: normalizedTokens },
      },
      orderBy: [{ userId: "desc" }],
    });
  }
}
