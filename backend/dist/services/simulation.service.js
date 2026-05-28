"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const zod_1 = require("zod");
const simulationSchema = zod_1.z.object({
    monthlyExtraSaving: zod_1.z.coerce.number().min(0).default(0),
    months: zod_1.z.coerce.number().int().min(1).max(120).default(12),
});
class SimulationService {
    constructor(predictionService) {
        this.predictionService = predictionService;
    }
    async run(userId, rawQuery) {
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
exports.SimulationService = SimulationService;
