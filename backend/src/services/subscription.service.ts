import { SubscriptionFrequency } from "@prisma/client";
import { z } from "zod";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { AppError } from "../utils/app-error";

const createSubscriptionSchema = z.object({
  categoryId: z.uuid().optional(),
  name: z.string().min(2).max(140),
  amount: z.number().positive(),
  frequency: z.enum(SubscriptionFrequency),
  nextChargeDate: z.coerce.date(),
  isActive: z.boolean().optional(),
});

const updateSubscriptionSchema = createSubscriptionSchema.partial().refine((data) => Object.keys(data).length > 0);

export class SubscriptionService {
  constructor(private readonly subscriptionRepository: SubscriptionRepository) {}

  async create(userId: string, rawInput: unknown) {
    const input = createSubscriptionSchema.parse(rawInput);
    return this.subscriptionRepository.create({ userId, ...input });
  }

  async list(userId: string) {
    return this.subscriptionRepository.listByUser(userId);
  }

  async update(userId: string, subscriptionId: string, rawInput: unknown) {
    const input = updateSubscriptionSchema.parse(rawInput);
    const updated = await this.subscriptionRepository.update(userId, subscriptionId, input);

    if (!updated) {
      throw new AppError("Assinatura nao encontrada", 404);
    }

    return updated;
  }

  async delete(userId: string, subscriptionId: string) {
    const deleted = await this.subscriptionRepository.delete(userId, subscriptionId);
    if (!deleted) {
      throw new AppError("Assinatura nao encontrada", 404);
    }
  }
}
