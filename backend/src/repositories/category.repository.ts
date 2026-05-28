import { prisma } from "../config/prisma";

export class CategoryRepository {
  async findById(categoryId: string) {
    return prisma.category.findUnique({ where: { id: categoryId } });
  }

  async listForUser(userId: string) {
    return prisma.category.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { name: "asc" },
    });
  }
}
