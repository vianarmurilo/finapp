"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleGamificationJobs = scheduleGamificationJobs;
const gamificationService_1 = require("../services/gamification/gamificationService");
const gamificationService = new gamificationService_1.GamificationService();
function scheduleGamificationJobs() {
    gamificationService.scheduleDailyJobs();
}
