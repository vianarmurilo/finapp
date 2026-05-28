import { z } from "zod";
import { PredictionService } from "./prediction.service";

const simulationSchema = z.object({
  monthlyExtraSaving: z.coerce.number().min(0).default(0),
  months: z.coerce.number().int().min(1).max(120).default(12),
});

export class SimulationService {
  constructor(private readonly predictionService: PredictionService) {}

  async run(userId: string, rawQuery: unknown) {
    const query = simulationSchema.parse(rawQuery);
    const prediction = await this.predictionService.predict(userId, { daysAhead: query.months * 30 });

    const extraSavingTotal = query.monthlyExtraSaving * query.months;
    const adjustedFutureBalance = prediction.futureBalance + extraSavingTotal;

    return {
      baselineFutureBalance: prediction.futureBalance,
      monthlyExtraSaving: query.monthlyExtraSaving,
      months: query.months,
      extraSavingTotal,
      adjustedFutureBalance,
      delta: adjustedFutureBalance - prediction.futureBalance,
    };
  }
}
