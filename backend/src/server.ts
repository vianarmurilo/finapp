import { app } from "./app";
import { env } from "./config/env";
import { scheduleGamificationJobs } from "./bootstrap/gamificationScheduler";

scheduleGamificationJobs();

app.listen(env.PORT, () => {
  console.log(`FinMind AI+ API rodando na porta ${env.PORT}`);
});
