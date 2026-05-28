import { z } from "zod";
import { FinancialProfileService } from "./financial-profile.service";
import { PredictionService } from "./prediction.service";

const advisorQuerySchema = z.object({
  goalAmount: z.coerce.number().positive().optional(),
  months: z.coerce.number().int().min(1).max(120).default(12),
});

export class AdvisorService {
  constructor(
    private readonly predictionService: PredictionService,
    private readonly financialProfileService: FinancialProfileService,
  ) {}

  async advise(userId: string, rawQuery: unknown) {
    const query = advisorQuerySchema.parse(rawQuery);
    const [prediction, profile] = await Promise.all([
      this.predictionService.predict(userId, { daysAhead: query.months * 30 }),
      this.financialProfileService.analyze(userId),
    ]);

    const recommendations: string[] = [];

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
