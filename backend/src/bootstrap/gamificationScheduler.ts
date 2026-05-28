import { GamificationService } from "../services/gamification/gamificationService";

const gamificationService = new GamificationService();

export function scheduleGamificationJobs() {
  gamificationService.scheduleDailyJobs();
}
