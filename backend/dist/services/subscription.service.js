"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
const createSubscriptionSchema = zod_1.z.object({
    categoryId: zod_1.z.uuid().optional(),
    name: zod_1.z.string().min(2).max(140),
    amount: zod_1.z.number().positive(),
    frequency: zod_1.z.enum(client_1.SubscriptionFrequency),
    nextChargeDate: zod_1.z.coerce.date(),
    isActive: zod_1.z.boolean().optional(),
});
const updateSubscriptionSchema = createSubscriptionSchema.partial().refine((data) => Object.keys(data).length > 0);
class SubscriptionService {
    constructor(subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }
    async create(userId, rawInput) {
        const input = createSubscriptionSchema.parse(rawInput);
        return this.subscriptionRepository.create({ userId, ...input });
    }
    async list(userId) {
        return this.subscriptionRepository.listByUser(userId);
    }
    async update(userId, subscriptionId, rawInput) {
        const input = updateSubscriptionSchema.parse(rawInput);
        const updated = await this.subscriptionRepository.update(userId, subscriptionId, input);
        if (!updated) {
            throw new app_error_1.AppError("Assinatura nao encontrada", 404);
        }
        return updated;
    }
    async delete(userId, subscriptionId) {
        const deleted = await this.subscriptionRepository.delete(userId, subscriptionId);
        if (!deleted) {
            throw new app_error_1.AppError("Assinatura nao encontrada", 404);
        }
    }
}
exports.SubscriptionService = SubscriptionService;
