"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisorService = void 0;
const zod_1 = require("zod");
const advisorQuerySchema = zod_1.z.object({
    goalAmount: zod_1.z.coerce.number().positive().optional(),
    months: zod_1.z.coerce.number().int().min(1).max(120).default(12),
});
class AdvisorService {
    constructor(predictionService, financialProfileService) {
        this.predictionService = predictionService;
        this.financialProfileService = financialProfileService;
    }
    async advise(userId, rawQuery) {
        const query = advisorQuerySchema.parse(rawQuery);
        const [prediction, profile] = await Promise.all([
            this.predictionService.predict(userId, { daysAhead: query.months * 30 }),
            this.financialProfileService.analyze(userId),
        ]);
        const recommendations = [];
        if (prediction.futureBalance < 0) {
            recommendations.push("Reduza gastos variaveis em pelo menos 15% para evitar saldo negativo.");
        }
        if (profile.profile === "Impulsivo") {
            recommendations.push("Ative limite semanal para categorias de lazer e delivery.");
            recommendations.push("Use regra de 24 horas antes de compras nao essenciais.");
        }
        if (profile.profile === "Conservador") {
            recommendations.push("Considere alocar parte da sobra para reserva de emergencia e investimentos.");
        }
        if (query.goalAmount) {
            const requiredMonthly = query.goalAmount / query.months;
            recommendations.push(`Para atingir R$ ${query.goalAmount.toFixed(2)} em ${query.months} meses, reserve cerca de R$ ${requiredMonthly.toFixed(2)} por mes.`);
        }
        if (!recommendations.length) {
            recommendations.push("Seu plano financeiro esta equilibrado. Continue monitorando metas e recorrencias.");
        }
        return {
            profile: profile.profile,
            prediction,
            recommendations,
        };
    }
}
exports.AdvisorService = AdvisorService;
